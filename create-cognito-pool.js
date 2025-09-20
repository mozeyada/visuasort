const { CognitoIdentityProviderClient, CreateUserPoolCommand, CreateUserPoolClientCommand } = require('@aws-sdk/client-cognito-identity-provider');

async function createCognitoResources() {
  const client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });

  // Create User Pool
  const userPoolCommand = new CreateUserPoolCommand({
    PoolName: 'n11693860-visuasort-users',
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true
      }
    },
    AutoVerifiedAttributes: ['email'],
    UsernameAttributes: ['email'],
    UsernameConfiguration: {
      CaseSensitive: false
    },
    Schema: [
      {
        Name: 'email',
        AttributeDataType: 'String',
        Required: true,
        Mutable: true
      },
      {
        Name: 'custom:role',
        AttributeDataType: 'String',
        Required: false,
        Mutable: true
      }
    ]
  });

  try {
    const userPoolResponse = await client.send(userPoolCommand);
    const userPoolId = userPoolResponse.UserPool.Id;
    console.log('User Pool created:', userPoolId);

    // Create User Pool Client
    const clientCommand = new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: 'n11693860-visuasort-client',
      GenerateSecret: false, // Web app doesn't need secret
      ExplicitAuthFlows: [
        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
        'ALLOW_USER_PASSWORD_AUTH', 
        'ALLOW_REFRESH_TOKEN_AUTH'
      ]
    });

    const clientResponse = await client.send(clientCommand);
    console.log('User Pool Client created:', clientResponse.UserPoolClient.ClientId);
    
    console.log('\nAdd these to AWS Secrets Manager:');
    console.log(`COGNITO_USER_POOL_ID: ${userPoolId}`);
    console.log(`COGNITO_CLIENT_ID: ${clientResponse.UserPoolClient.ClientId}`);
    console.log('\nRun setup-secrets-manager.js to update the secret with these values.');
    
    return {
      userPoolId,
      clientId: clientResponse.UserPoolClient.ClientId
    };
  } catch (error) {
    console.error('Error creating Cognito resources:', error);
  }
}

createCognitoResources();
