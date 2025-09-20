const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

async function setupSecretsManager() {
  const client = new SecretsManagerClient({ region: 'ap-southeast-2' });
  
  const secretName = 'n11693860-visuasort-secrets';
  const secretValue = {
    JWT_SECRET: 'supersecret-production-jwt-key-change-this',
    IMAGGA_API_KEY: 'acc_5a099d2ce3b9a49',
    IMAGGA_API_SECRET: '0a7881fc07ddbd096187119eafdfab4d',
    HUGGINGFACE_API_KEY: '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',
    COGNITO_USER_POOL_ID: 'ap-southeast-2_3gyloQ1U7',
    COGNITO_CLIENT_ID: '7sjqo4runc50pd5eeshlqgm2b9'
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