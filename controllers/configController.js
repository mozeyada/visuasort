const parameterService = require('../services/parameterService');

exports.getConfig = async (req, res) => {
  try {
    const config = await parameterService.getApplicationConfig();
    
    res.json({
      apiBase: '/api/v1',
      appUrl: config.appUrl,
      domainUrl: config.domainUrl,
      apiVersion: config.apiVersion
    });
  } catch (error) {
    console.error('Config error:', error);
    res.json({
      apiBase: '/api/v1',
      appUrl: 'http://localhost:3000',
      domainUrl: 'http://localhost:3000',
      apiVersion: 'v1'
    });
  }
};