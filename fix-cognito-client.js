const { CognitoIdentityProviderClient, UpdateUserPoolClientCommand } = require('@aws-sdk/client-cognito-identity-provider');
const secretsService = require('./services/secretsService');

async function fixCognitoClient() {
  const client = new CognitoIdentityProviderClient({ region: 'ap-southeast-2' });
  
  try {
    const config = await secretsService.getCognitoConfig();
    
    const command = new UpdateUserPoolClientCommand({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
      ExplicitAuthFlows: [
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_ADMIN_USER_PASSWORD_AUTH', 
        'ALLOW_REFRESH_TOKEN_AUTH'
      ]
    });

    await client.send(command);
    console.log('✅ Cognito client updated with USER_PASSWORD_AUTH flow');
    
  } catch (error) {
    console.error('❌ Error updating Cognito client:', error.message);
  }
}

fixCognitoClient();