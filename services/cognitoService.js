const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, CreateGroupCommand, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const secretsService = require('./secretsService');

class CognitoService {
  constructor() {
    this.client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
    this.verifier = null;
  }

  async getConfig() {
    return await secretsService.getCognitoConfig();
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
      throw new Error(`Registration failed: ${error.message}`);
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
      throw new Error(`Confirmation failed: ${error.message}`);
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
            role: payload['custom:role'] || 'user',
            groups: payload['cognito:groups'] || [],
            sub: payload.sub
          }
        };
      }
      
      throw new Error('Authentication failed - no tokens returned');
    } catch (error) {
      console.error('Cognito Authentication error:', error);
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async verifyToken(idToken) {
    try {
      const verifier = await this.getJwtVerifier();
      const payload = await verifier.verify(idToken);
      
      const groups = payload['cognito:groups'] || [];
      const role = groups.includes('Administrators') ? 'admin' : 'user';
      
      return {
        valid: true,
        user: {
          username: payload['cognito:username'],
          email: payload.email,
          role: role,
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

    for (const group of groups) {
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
    }
  }

  async addUserToGroup(username, groupName) {
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