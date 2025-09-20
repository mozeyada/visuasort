const cognitoService = require('../services/cognitoService');
const secretsService = require('../services/secretsService');
const jwt = require('jsonwebtoken');

/**
 * Hybrid authentication middleware
 * Supports both legacy JWT and Cognito tokens
 */
module.exports = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied - no token provided' });
  }

  // Detect token type by checking JWT header
  let isCognitoToken = false;
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    isCognitoToken = header.kid !== undefined; // Cognito tokens have 'kid' claim
  } catch (error) {
    // Invalid JWT format, will fail both verifications
  }

  if (isCognitoToken) {
    // Try Cognito token verification
    try {
      const cognitoResult = await cognitoService.verifyToken(token);
      if (cognitoResult.valid) {
        req.user = {
          username: cognitoResult.user.username,
          role: cognitoResult.user.role,
          email: cognitoResult.user.email,
          authType: 'cognito'
        };
        return next();
      }
    } catch (error) {
      return res.status(401).json({ error: 'Invalid Cognito token' });
    }
  } else {
    // Try legacy JWT verification
    try {
      const jwtSecret = await secretsService.getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret);
      req.user = {
        ...decoded,
        authType: 'legacy'
      };
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid legacy token' });
    }
  }

  res.status(401).json({ error: 'Invalid token' });
};