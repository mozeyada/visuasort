const secretsService = require('../services/secretsService');
const parameterService = require('../services/parameterService');
const elasticacheService = require('../services/elasticacheService');

exports.getServiceStatus = async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    // Test Secrets Manager
    await secretsService.getAllSecrets();
    status.services.secretsManager = { status: 'CONNECTED', source: 'AWS Secrets Manager' };

    // Test Parameter Store
    await parameterService.getApplicationConfig();
    status.services.parameterStore = { status: 'CONNECTED', source: 'AWS Parameter Store' };

    // ElastiCache Status
    const cacheStats = elasticacheService.getStats();
    status.services.elastiCache = {
      status: 'CONNECTED',
      source: 'AWS ElastiCache',
      endpoint: cacheStats.endpoint,
      stats: cacheStats
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service status' });
  }
};