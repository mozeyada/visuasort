const elasticacheService = require('../services/elasticacheService');

exports.getStats = (req, res) => {
  try {
    const stats = elasticacheService.getStats();
    res.json({
      cache: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
};

exports.clearCache = async (req, res) => {
  try {
    await elasticacheService.clear();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

exports.cleanup = (req, res) => {
  try {
    const cleaned = elasticacheService.cleanup();
    res.json({ 
      message: `Cache cleanup completed. Removed ${cleaned} expired entries.`,
      cleaned 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup cache' });
  }
};