/**
 * DynamoDB Service for Visuasort Image Management
 * Implements QUT CAB432 requirements with qut-username partition key
 * Handles all database operations for image metadata storage
 * Includes in-memory caching for performance optimization
 */
const DynamoDB = require("@aws-sdk/client-dynamodb");
const DynamoDBLib = require("@aws-sdk/lib-dynamodb");
const elasticacheService = require('./elasticacheService');

class VisuaSortDynamoService {
  constructor() {
    // Initialize DynamoDB client for ap-southeast-2 region
    const client = new DynamoDB.DynamoDBClient({ region: "ap-southeast-2" });
    this.docClient = DynamoDBLib.DynamoDBDocumentClient.from(client);
    this.tableName = "n11693860-visuasort-images";
    // QUT CAB432 requirement: partition key must be qut-username
    this.qutUsername = "n11693860@qut.edu.au";
  }

  async saveImage(imageData) {
    const command = new DynamoDBLib.PutCommand({
      TableName: this.tableName,
      Item: {
        "qut-username": this.qutUsername, // Required partition key for QUT account
        "imageId": `${imageData.owner}#${imageData.id}`, // Composite sort key for user separation
        ...imageData
      }
    });

    try {
      await this.docClient.send(command);
      
      // Invalidate related caches (non-blocking)
      try {
        await elasticacheService.invalidateUserImages(imageData.owner);
        await elasticacheService.cacheImageMetadata(imageData.id, imageData);
      } catch (cacheError) {
        console.warn('Cache operation failed:', cacheError.message);
      }
      
      return imageData;
    } catch (error) {
      console.error('DynamoDB saveImage error:', error);
      throw error;
    }
  }

  async getImages(owner, options = {}) {
    const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
    
    // Check cache first
    try {
      const cached = await elasticacheService.getUserImages(owner);
      if (cached) {
        console.log('Cache hit: user images for', owner);
        return cached;
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError.message);
    }
    
    const command = new DynamoDBLib.QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#partitionKey = :username",
      FilterExpression: "#owner = :owner",
      ExpressionAttributeNames: {
        "#partitionKey": "qut-username",
        "#owner": "owner"
      },
      ExpressionAttributeValues: {
        ":username": this.qutUsername,
        ":owner": owner
      }
    });

    try {
      const response = await this.docClient.send(command);
      const images = response.Items || [];
      const result = this.applySortingAndPagination(images, { page, limit, sort, order });
      
      // Cache the result (non-blocking)
      try {
        await elasticacheService.cacheUserImages(owner, result.data, result.pagination);
      } catch (cacheError) {
        console.warn('Cache write failed:', cacheError.message);
      }
      
      return result;
    } catch (error) {
      console.error('Database query failed for getImages:', error);
      return { data: [], pagination: { page: 1, limit, total: 0, pages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async getImageById(id) {
    // Check cache first
    try {
      const cached = await elasticacheService.getImageMetadata(id);
      if (cached) {
        console.log('Cache hit: image metadata for', id);
        return cached;
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError.message);
    }
    
    const command = new DynamoDBLib.ScanCommand({
      TableName: this.tableName,
      FilterExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id
      }
    });

    try {
      const response = await this.docClient.send(command);
      const image = response.Items && response.Items.length > 0 ? response.Items[0] : null;
      
      // Cache the result if found (non-blocking)
      if (image) {
        try {
          await elasticacheService.cacheImageMetadata(id, image);
        } catch (cacheError) {
          console.warn('Cache write failed:', cacheError.message);
        }
      }
      
      return image;
    } catch (error) {
      console.error('Database query failed for getImageById:', error);
      return null;
    }
  }

  async deleteImage(id) {
    const image = await this.getImageById(id);
    if (!image) return;

    const command = new DynamoDBLib.DeleteCommand({
      TableName: this.tableName,
      Key: {
        "qut-username": this.qutUsername,
        "imageId": `${image.owner}#${image.id}`
      }
    });

    try {
      await this.docClient.send(command);
    } catch (error) {
      console.error('Database delete operation failed:', error);
      throw error;
    }
  }

  async updateImageTags(id, tags) {
    const image = await this.getImageById(id);
    if (!image) return;

    const command = new DynamoDBLib.UpdateCommand({
      TableName: this.tableName,
      Key: {
        "qut-username": this.qutUsername,
        "imageId": `${image.owner}#${image.id}`
      },
      UpdateExpression: "SET tags = :tags",
      ExpressionAttributeValues: {
        ":tags": tags
      }
    });

    try {
      await this.docClient.send(command);
    } catch (error) {
      console.error('Database update operation failed for tags:', error);
      throw error;
    }
  }

  async searchImages(query, owner, options = {}) {
    const command = new DynamoDBLib.QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#partitionKey = :username",
      FilterExpression: "#owner = :owner AND (contains(filename, :query) OR contains(tags, :query))",
      ExpressionAttributeNames: {
        "#partitionKey": "qut-username",
        "#owner": "owner"
      },
      ExpressionAttributeValues: {
        ":username": this.qutUsername,
        ":owner": owner,
        ":query": query.toLowerCase()
      }
    });

    try {
      const response = await this.docClient.send(command);
      return this.applySortingAndPagination(response.Items || [], options);
    } catch (error) {
      console.error('Database search operation failed:', error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async filterImages(filters, owner, options = {}) {
    const command = new DynamoDBLib.QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#partitionKey = :username",
      FilterExpression: "#owner = :owner",
      ExpressionAttributeNames: {
        "#partitionKey": "qut-username",
        "#owner": "owner"
      },
      ExpressionAttributeValues: {
        ":username": this.qutUsername,
        ":owner": owner
      }
    });

    try {
      const response = await this.docClient.send(command);
      let images = response.Items || [];
      
      // Apply client-side filtering for complex queries not supported by DynamoDB FilterExpression
      images = images.filter(img => {
        if (filters.sizeRange) {
          const size = img.size || 0;
          if (filters.sizeRange === 'small' && size > 1024 * 1024) return false;
          if (filters.sizeRange === 'medium' && (size < 1024 * 1024 || size > 5 * 1024 * 1024)) return false;
          if (filters.sizeRange === 'large' && size < 5 * 1024 * 1024) return false;
        }
        
        if (filters.dateRange && img.uploadDate) {
          const uploadDate = new Date(img.uploadDate);
          const now = new Date();
          const daysDiff = (now - uploadDate) / (1000 * 60 * 60 * 24);
          
          if (filters.dateRange === 'today' && daysDiff > 1) return false;
          if (filters.dateRange === 'week' && daysDiff > 7) return false;
          if (filters.dateRange === 'month' && daysDiff > 30) return false;
        }
        
        if (filters.captionCategory && img.tags) {
          const selectedCategory = filters.captionCategory.toLowerCase();
          if (Array.isArray(img.tags)) {
            if (!img.tags.some(tag => tag.toLowerCase().includes(selectedCategory))) return false;
          }
        }
        
        return true;
      });
      
      return this.applySortingAndPagination(images, options);
    } catch (error) {
      console.error('Database filter operation failed:', error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async getTagCategories(owner) {
    // Check cache first
    try {
      const cached = await elasticacheService.getTagCategories(owner);
      if (cached) {
        console.log('Cache hit: tag categories for', owner);
        return cached;
      }
    } catch (cacheError) {
      console.warn('Cache read failed:', cacheError.message);
    }
    
    try {
      const command = new DynamoDBLib.QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "#partitionKey = :username",
        FilterExpression: "#owner = :owner",
        ExpressionAttributeNames: {
          "#partitionKey": "qut-username",
          "#owner": "owner"
        },
        ExpressionAttributeValues: {
          ":username": this.qutUsername,
          ":owner": owner
        }
      });

      const response = await this.docClient.send(command);
      const images = response.Items || [];
      const categories = new Set();
      
      images.forEach(img => {
        if (img.tags && Array.isArray(img.tags)) {
          img.tags.forEach(tag => {
            const cleanTag = tag.trim().toLowerCase();
            if (cleanTag) {
              categories.add(cleanTag);
            }
          });
        }
      });
      
      const result = Array.from(categories).sort();
      
      // Cache the result (non-blocking)
      try {
        await elasticacheService.cacheTagCategories(owner, result);
      } catch (cacheError) {
        console.warn('Cache write failed:', cacheError.message);
      }
      
      return result;
    } catch (error) {
      console.error('Database query failed for categories:', error);
      return [];
    }
  }

  async getAllImages(options = {}) {
    const command = new DynamoDBLib.QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "#partitionKey = :username",
      ExpressionAttributeNames: {
        "#partitionKey": "qut-username"
      },
      ExpressionAttributeValues: {
        ":username": this.qutUsername
      }
    });

    try {
      const response = await this.docClient.send(command);
      const images = response.Items || [];
      return this.applySortingAndPagination(images, options);
    } catch (error) {
      console.error('Database query failed for getAllImages:', error);
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false } };
    }
  }

  async updateImage(id, updates) {
    const image = await this.getImageById(id);
    if (!image) return;

    const updateExpressions = [];
    const expressionAttributeValues = {};
    
    Object.keys(updates).forEach(key => {
      updateExpressions.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = updates[key];
    });

    const command = new DynamoDBLib.UpdateCommand({
      TableName: this.tableName,
      Key: {
        "qut-username": this.qutUsername,
        "imageId": `${image.owner}#${image.id}`
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues
    });

    try {
      await this.docClient.send(command);
    } catch (error) {
      console.error('Database update operation failed:', error);
      throw error;
    }
  }

  applySortingAndPagination(images, options) {
    const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
    
    const sortedImages = images.sort((a, b) => {
      let aVal = a[sort];
      let bVal = b[sort];
      
      if (sort === 'uploadDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sort === 'size') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
      }
      
      if (sort === 'filename') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      
      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    const total = sortedImages.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedImages = sortedImages.slice(startIndex, endIndex);
    
    return {
      data: paginatedImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1
      }
    };
  }
}

module.exports = new VisuaSortDynamoService();