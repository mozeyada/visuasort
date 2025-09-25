const { CognitoIdentityProviderClient, SignUpCommand, ConfirmSignUpCommand, InitiateAuthCommand, CreateGroupCommand, AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminSetUserPasswordCommand, RespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const crypto = require('crypto');
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

  secretHash(clientId, clientSecret, username) {
    if (!clientSecret) return undefined;
    const hasher = crypto.createHmac('sha256', clientSecret);
    hasher.update(`${username}${clientId}`);
    return hasher.digest('base64');
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

  async signUp(username, password, email) {
    const config = await this.getConfig();
    
    const params = {
      ClientId: config.clientId,
      Username: username,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        }
      ]
    };
    
    // Add SecretHash if client secret exists
    if (config.clientSecret) {
      params.SecretHash = this.secretHash(config.clientId, config.clientSecret, username);
    }
    
    const command = new SignUpCommand(params);

    try {
      const response = await this.client.send(command);
      
      // Add user to 'users' group after successful registration
      try {
        await this.addUserToGroup(username, 'users');
      } catch (groupError) {
        console.warn('Failed to add user to group:', groupError.message);
        // Don't fail registration if group assignment fails
      }
      
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
    
    const params = {
      ClientId: config.clientId,
      Username: username,
      ConfirmationCode: confirmationCode
    };
    
    // Add SecretHash if client secret exists
    if (config.clientSecret) {
      params.SecretHash = this.secretHash(config.clientId, config.clientSecret, username);
    }
    
    const command = new ConfirmSignUpCommand(params);

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
    
    const authParams = {
      USERNAME: username,
      PASSWORD: password
    };
    
    // Add SECRET_HASH if client secret exists
    if (config.clientSecret) {
      authParams.SECRET_HASH = this.secretHash(config.clientId, config.clientSecret, username);
    }
    
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: config.clientId,
      AuthParameters: authParams
    });

    try {
      const response = await this.client.send(command);
      
      console.log('Cognito authentication response:', {
        challengeName: response.ChallengeName,
        hasSession: !!response.Session,
        hasAuthResult: !!response.AuthenticationResult
      });
      
      // Handle ALL MFA challenges including EMAIL_OTP
      if (response.ChallengeName && (response.ChallengeName.includes('MFA') || response.ChallengeName === 'EMAIL_OTP')) {
        return {
          success: false,
          challengeName: response.ChallengeName,
          session: response.Session,
          message: 'MFA code required. Check your email for the verification code.'
        };
      }
      
      // Handle NEW_PASSWORD_REQUIRED challenge
      if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
        const challengeParams = {
          NEW_PASSWORD: password, // Use same password as permanent
        };
        
        if (config.clientSecret) {
          challengeParams.SECRET_HASH = this.secretHash(config.clientId, config.clientSecret, username);
        }
        
        const challengeCommand = new RespondToAuthChallengeCommand({
          ClientId: config.clientId,
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          Session: response.Session,
          ChallengeResponses: challengeParams
        });
        
        const challengeResponse = await this.client.send(challengeCommand);
        
        if (challengeResponse.AuthenticationResult) {
          const { IdToken, AccessToken, RefreshToken } = challengeResponse.AuthenticationResult;
          
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
      }
      
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
      
      // If we get here, there was no AuthenticationResult and no challenge
      // This shouldn't happen, but let's handle it gracefully
      console.log('Unexpected response from Cognito:', response);
      throw new Error('Authentication failed - unexpected response from Cognito');
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
        GroupName: 'admins',
        Description: 'Administrator users',
        Precedence: 1
      },
      {
        GroupName: 'users', 
        Description: 'Regular users',
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
    return groups.includes('admins') ? 'admin' : 'user';
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

  async verifyMfaCode(username, mfaCode, session, challengeName = 'EMAIL_OTP') {
    const config = await this.getConfig();
    
    // Use correct parameter based on challenge type
    const challengeParams = {
      USERNAME: username
    };
    
    if (challengeName === 'EMAIL_OTP') {
      challengeParams.EMAIL_OTP_CODE = mfaCode;
    } else if (challengeName.includes('SMS')) {
      challengeParams.SMS_MFA_CODE = mfaCode;
    } else {
      challengeParams.SOFTWARE_TOKEN_MFA_CODE = mfaCode;
    }
    
    if (config.clientSecret) {
      challengeParams.SECRET_HASH = this.secretHash(config.clientId, config.clientSecret, username);
    }
    
    const command = new RespondToAuthChallengeCommand({
      ClientId: config.clientId,
      ChallengeName: challengeName,
      Session: session,
      ChallengeResponses: challengeParams
    });
    
    console.log('MFA verification attempt:', {
      challengeName: challengeName,
      username: username,
      hasSession: !!session,
      hasCode: !!mfaCode
    });

    try {
      const response = await this.client.send(command);
      
      if (response.AuthenticationResult) {
        const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;
        
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
      
      throw new Error('MFA verification failed - no tokens returned');
    } catch (error) {
      console.error('MFA verification error:', error);
      const message = this.sanitizeError(error, 'MFA verification failed');
      throw new Error(message);
    }
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