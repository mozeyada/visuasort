const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, CreateGroupCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const secretsService = require('./secretsService');

class CognitoService {
  constructor() {
    this.client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
    this.verifier = null;
    this.config = null;
  }

  async getConfig() {
    if (!this.config) {
      this.config = await secretsService.getCognitoConfig();
    }
    return this.config;
  }

  async getJwtVerifier() {
    if (!this.verifier) {
      const config = await this.getConfig();
      this.verifier = CognitoJwtVerifier.create({
        userPoolId: config.userPoolId,
        tokenUse: 'id',
        clientId: config.clientId,
      });
    }
    return this.verifier;
  }

  async signUp(username, password, email, role = 'user') {
    const config = await this.getConfig();
    
    const command = new SignUpCommand({
      ClientId: config.clientId,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'custom:role',
          Value: role
        }
      ]
    });

    try {
      const response = await this.client.send(command);
      return {
        success: true,
        userSub: response.UserSub,
        message: 'User registered successfully. Please check your email for confirmation code.'
      };
    } catch (error) {
      console.error('Cognito SignUp error:', error);
      const message = this.sanitizeError(error, 'Registration failed');
      throw new Error(message);
    }
  }

  async confirmSignUp(username, confirmationCode) {
    const config = await this.getConfig();
    
    const command = new ConfirmSignUpCommand({
      ClientId: config.clientId,
      Username: username,
      ConfirmationCode: confirmationCode
    });

    try {
      await this.client.send(command);
      return {
        success: true,
        message: 'Email confirmed successfully. You can now log in.'
      };
    } catch (error) {
      console.error('Cognito ConfirmSignUp error:', error);
      const message = this.sanitizeError(error, 'Email confirmation failed');
      throw new Error(message);
    }
  }

  async authenticate(username, password) {
    const config = await this.getConfig();
    
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    });

    try {
      const response = await this.client.send(command);
      
      if (response.AuthenticationResult) {
        const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;
        
        // Verify and decode the ID token
        const verifier = await this.getJwtVerifier();
        const payload = await verifier.verify(IdToken);
        
        return {
          success: true,
          tokens: {
            idToken: IdToken,
            accessToken: AccessToken,
            refreshToken: RefreshToken
          },
          user: {
            username: payload['cognito:username'],
            email: payload.email,
            role: this.determineRole(payload['cognito:groups'] || []),
            groups: payload['cognito:groups'] || [],
            sub: payload.sub
          }
        };
      }
      
      throw new Error('Authentication failed - no tokens returned');
    } catch (error) {
      console.error('Cognito Authentication error:', error);
      const message = this.sanitizeError(error, 'Login failed');
      throw new Error(message);
    }
  }

  async verifyToken(idToken) {
    try {
      const verifier = await this.getJwtVerifier();
      const payload = await verifier.verify(idToken);
      
      const groups = payload['cognito:groups'] || [];
      
      return {
        valid: true,
        user: {
          username: payload['cognito:username'],
          email: payload.email,
          role: this.determineRole(groups),
          groups: groups,
          sub: payload.sub
        }
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return { valid: false };
    }
  }

  async createUserGroups() {
    const config = await this.getConfig();
    
    const groups = [
      {
        GroupName: 'Administrators',
        Description: 'Admin users with full access to all features',
        Precedence: 1
      },
      {
        GroupName: 'Users', 
        Description: 'Regular users with standard access',
        Precedence: 2
      }
    ];

    const groupPromises = groups.map(async (group) => {
      try {
        const command = new CreateGroupCommand({
          UserPoolId: config.userPoolId,
          ...group
        });
        
        await this.client.send(command);
        console.log(`✅ Created group: ${group.GroupName}`);
      } catch (error) {
        if (error.name === 'GroupExistsException') {
          console.log(`ℹ️  Group already exists: ${group.GroupName}`);
        } else {
          console.error(`❌ Failed to create group ${group.GroupName}:`, error.message);
        }
      }
    });
    
    await Promise.all(groupPromises);
  }

  determineRole(groups) {
    return groups.includes('Administrators') ? 'admin' : 'user';
  }

  sanitizeError(error, defaultMessage) {
    // Map specific Cognito errors to user-friendly messages
    const errorMap = {
      'UserNotConfirmedException': 'Please confirm your email before logging in',
      'NotAuthorizedException': 'Invalid username or password',
      'UsernameExistsException': 'Username already exists',
      'InvalidParameterException': 'Invalid input provided',
      'CodeMismatchException': 'Invalid confirmation code',
      'ExpiredCodeException': 'Confirmation code has expired'
    };
    
    return errorMap[error.name] || defaultMessage;
  }

  async addUserToGroup(username, groupName) {
    if (!username || !groupName) {
      throw new Error('Username and group name are required');
    }
    const config = await this.getConfig();
    
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: config.userPoolId,
        Username: username,
        GroupName: groupName
      });
      
      await this.client.send(command);
      console.log(`✅ Added ${username} to group: ${groupName}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to add user to group:`, error.message);
      throw new Error(`Failed to add user to group: ${error.message}`);
    }
  }
}

module.exports = new CognitoService();