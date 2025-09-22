const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
require('dotenv').config();

class SecretsService {
  constructor() {
    this.secretName = "n11693860-visuasort-secrets";
    this.client = new SecretsManagerClient({ region: "ap-southeast-2" });
    this.cache = null;
    this.cacheTime = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getAllSecrets() {
    // Use .env for local development
    if (process.env.NODE_ENV === 'development' && process.env.COGNITO_USER_POOL_ID) {
      console.log('✅ Using local .env configuration');
      return {

        IMAGGA_API_KEY: process.env.IMAGGA_API_KEY,
        IMAGGA_API_SECRET: process.env.IMAGGA_API_SECRET,
        HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
        COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
        COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET
      };
    }

    const now = Date.now();
    
    // Return cached secrets if still valid
    if (this.cache && this.cacheTime && (now - this.cacheTime < this.cacheExpiry)) {
      return this.cache;
    }

    const response = await this.client.send(
      new GetSecretValueCommand({
        SecretId: this.secretName,
        VersionStage: "AWSCURRENT"
      })
    );
    
    this.cache = JSON.parse(response.SecretString);
    this.cacheTime = now;
    
    console.log('✅ Retrieved secrets from AWS Secrets Manager');
    return this.cache;
  }



  async getImaggaCredentials() {
    const secrets = await this.getAllSecrets();
    return {
      key: secrets.IMAGGA_API_KEY,
      secret: secrets.IMAGGA_API_SECRET
    };
  }

  async getHuggingFaceKey() {
    const secrets = await this.getAllSecrets();
    return secrets.HUGGINGFACE_API_KEY;
  }

  async getCognitoConfig() {
    const secrets = await this.getAllSecrets();
    return {
      userPoolId: secrets.COGNITO_USER_POOL_ID,
      clientId: secrets.COGNITO_CLIENT_ID,
      clientSecret: secrets.COGNITO_CLIENT_SECRET || null
    };
  }
}

module.exports = new SecretsService();