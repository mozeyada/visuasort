const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

async function setupSecretsManager() {
  const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
  
  const secretName = 'n11693860-visuasort-secrets';
  // IMPORTANT: Replace these placeholder values with real credentials before deployment
  const secretValue = {
    IMAGGA_API_KEY: 'your-imagga-api-key', // Replace with actual Imagga API key
    IMAGGA_API_SECRET: 'your-imagga-api-secret', // Replace with actual Imagga API secret
    HUGGINGFACE_API_KEY: 'your-huggingface-token', // Replace with actual Hugging Face token
    COGNITO_USER_POOL_ID: 'your-cognito-user-pool-id', // Will be set by CloudFormation
    COGNITO_CLIENT_ID: 'your-cognito-client-id', // Will be set by CloudFormation
    COGNITO_CLIENT_SECRET: 'your-cognito-client-secret' // Will be set by CloudFormation
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