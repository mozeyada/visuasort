const { SSMClient, GetParameterCommand, GetParametersCommand } = require('@aws-sdk/client-ssm');

class ParameterService {
  constructor() {
    this.client = new SSMClient({ region: 'ap-southeast-2' });
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getParameter(name) {
    const cacheKey = name;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < this.cacheExpiry)) {
      return cached.value;
    }

    try {
      const command = new GetParameterCommand({
        Name: name,
        WithDecryption: true
      });
      
      const response = await this.client.send(command);
      const value = response.Parameter.Value;
      
      this.cache.set(cacheKey, {
        value,
        timestamp: Date.now()
      });
      
      console.log(`Parameter Store: Retrieved ${name}`);
      return value;
    } catch (error) {
      console.error(`❌ Parameter Store failed for ${name}:`, error.message);
      throw error;
    }
  }

  async getApplicationConfig() {
    try {
      const command = new GetParametersCommand({
        Names: [
          '/n11693860/visuasort/app-url',
          '/n11693860/visuasort/domain-url',
          '/n11693860/visuasort/api-version',
          '/n11693860/visuasort/max-upload-size'
        ],
        WithDecryption: true
      });
      
      const response = await this.client.send(command);
      const config = {};
      
      response.Parameters.forEach(param => {
        const key = param.Name.split('/').pop();
        config[key] = param.Value;
      });
      
      return {
        appUrl: config['app-url'],
        domainUrl: config['domain-url'],
        apiVersion: config['api-version'],
        maxUploadSize: parseInt(config['max-upload-size'])
      };
    } catch (error) {
      console.error('Failed to get application config:', error.message);
      throw error;
    }
  }
}

module.exports = new ParameterService();