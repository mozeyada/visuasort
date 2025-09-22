/**
 * ElastiCache Memcached Service for Visuasort
 * Distributed caching layer to improve application performance
 * Reduces database load by caching frequently accessed data
 */
const Memcached = require('memcached');

class CacheService {
  constructor() {
    this.memcached = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    
    let elasticacheEndpoint;
    try {
      const parameterService = require('./parameterService');
      elasticacheEndpoint = await parameterService.getParameter('/n11693860/visuasort/elasticache-endpoint');
    } catch (error) {
      console.warn('Parameter Store failed, using fallback endpoint');
    }
    
    // Fallback to hardcoded endpoint if Parameter Store fails
    if (!elasticacheEndpoint) {
      elasticacheEndpoint = 'visuasort.km2jzi.cfg.apse2.cache.amazonaws.com:11211';
      console.log('Using fallback ElastiCache endpoint');
    }
    this.memcached = new Memcached(elasticacheEndpoint, {
      timeout: 1000,
      retries: 2,
      retry: 1000,
      remove: true,
      failOverServers: undefined
    });
    
    this.defaultTTL = 300; // 5 minutes in seconds (memcached format)
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    this.initialized = true;
    console.log('📊 Cache Mode: AWS ElastiCache');
  }

  generateKey(prefix, ...parts) {
    return `visuasort:${prefix}:${parts.join(':')}`;
  }

  async set(key, value, ttl = this.defaultTTL) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      this.memcached.set(key, JSON.stringify(value), ttl, (err) => {
        if (err) {
          console.error('❌ ElastiCache set failed:', err.message);
          reject(err);
        } else {
          console.log('✅ ElastiCache: Successfully cached data');
          this.stats.sets++;
          resolve();
        }
      });
    });
  }

  async get(key) {
    await this.initialize();
    return new Promise((resolve) => {
      this.memcached.get(key, (err, data) => {
        if (err || !data) {
          this.stats.misses++;
          resolve(null);
        } else {
          this.stats.hits++;
          resolve(JSON.parse(data));
        }
      });
    });
  }

  async delete(key) {
    await this.initialize();
    return new Promise((resolve) => {
      this.memcached.del(key, () => resolve());
    });
  }

  async clear() {
    await this.initialize();
    return new Promise((resolve) => {
      this.memcached.flush(() => {
        this.stats = { hits: 0, misses: 0, sets: 0 };
        resolve();
      });
    });
  }

  // Cache user's images list
  async cacheUserImages(username, images, pagination) {
    const key = this.generateKey('user_images', username);
    await this.set(key, { images, pagination }, 120); // 2 minutes for dynamic data
  }

  async getUserImages(username) {
    const key = this.generateKey('user_images', username);
    return await this.get(key);
  }

  async invalidateUserImages(username) {
    const key = this.generateKey('user_images', username);
    await this.delete(key);
  }

  // Cache tag categories (accessed frequently)
  async cacheTagCategories(username, categories) {
    const key = this.generateKey('tag_categories', username);
    await this.set(key, categories, 600); // 10 minutes for relatively static data
  }

  async getTagCategories(username) {
    const key = this.generateKey('tag_categories', username);
    return await this.get(key);
  }

  // Cache image metadata (accessed when viewing images)
  async cacheImageMetadata(imageId, metadata) {
    const key = this.generateKey('image_metadata', imageId);
    await this.set(key, metadata, 300); // 5 minutes
  }

  async getImageMetadata(imageId) {
    const key = this.generateKey('image_metadata', imageId);
    return await this.get(key);
  }

  async invalidateImageMetadata(imageId) {
    const key = this.generateKey('image_metadata', imageId);
    await this.delete(key);
  }

  // Cache AI API responses (expensive external calls)
  async cacheAIResponse(imageHash, tags) {
    const key = this.generateKey('ai_tags', imageHash);
    await this.set(key, tags, 3600); // 1 hour for AI results
  }

  async getAIResponse(imageHash) {
    const key = this.generateKey('ai_tags', imageHash);
    return await this.get(key);
  }

  // Get cache statistics
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheType: 'ElastiCache',
      endpoint: 'From Parameter Store'
    };
  }

  // Cleanup expired entries (handled by ElastiCache TTL)
  cleanup() {
    console.log('ElastiCache handles TTL automatically');
    return 0;
  }
}

module.exports = new CacheService();