const cognitoService = require('../services/cognitoService');

module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied - no token provided' });
  }

  try {
    const result = await cognitoService.verifyToken(token);
    
    if (result.valid) {
      req.user = result.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Cognito auth middleware error:', error);
    res.status(401).json({ error: 'Token verification failed' });
  }
};