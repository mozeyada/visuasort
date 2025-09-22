const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

async function setupSecretsManager() {
  const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
  
  const secretName = 'n11693860-visuasort-secrets';
  const secretValue = {
    IMAGGA_API_KEY: 'your-imagga-api-key',
    IMAGGA_API_SECRET: 'your-imagga-api-secret',
    HUGGINGFACE_API_KEY: 'your-huggingface-token',
    COGNITO_USER_POOL_ID: 'your-cognito-user-pool-id',
    COGNITO_CLIENT_ID: 'your-cognito-client-id',
    COGNITO_CLIENT_SECRET: 'your-cognito-client-secret'
  };

  console.log('Setting up Secrets Manager...');
  
  try {
    // Try to create the secret
    const createCommand = new CreateSecretCommand({
      Name: secretName,
      Description: 'Visuasort application secrets for production deployment',
      SecretString: JSON.stringify(secretValue)
    });
    
    await client.send(createCommand);
    console.log(`✅ Created secret: ${secretName}`);
  } catch (error) {
    if (error.name === 'ResourceExistsException') {
      // Secret exists, update it
      try {
        const updateCommand = new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: JSON.stringify(secretValue)
        });
        
        await client.send(updateCommand);
        console.log(`✅ Updated existing secret: ${secretName}`);
      } catch (updateError) {
        console.error(`❌ Failed to update secret:`, updateError.message);
      }
    } else {
      console.error(`❌ Failed to create secret:`, error.message);
    }
  }
  
  console.log('\n🎉 Secrets Manager setup complete!');
  console.log('Secret contains:');
  Object.keys(secretValue).forEach(key => {
    console.log(`- ${key}: [HIDDEN]`);
  });
}

setupSecretsManager();