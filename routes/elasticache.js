const express = require('express');
const elasticacheController = require('../controllers/elasticacheController');
const cognitoAuth = require('../middleware/cognitoAuth');

const router = express.Router();

// Cache management endpoints (admin only)
router.get('/stats', cognitoAuth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, elasticacheController.getStats);

router.post('/clear', cognitoAuth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, elasticacheController.clearCache);

router.post('/cleanup', cognitoAuth, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, elasticacheController.cleanup);

module.exports = router;