const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, '../data/db.json'));
const db = low(adapter);

db.defaults({ images: [] }).write();

exports.saveImage = (imageData) => {
  return db.get('images').push(imageData).write();
};

exports.getImages = (owner, options = {}) => {
  const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
  
  let images = db.get('images').filter({ owner }).value();
  
  // Apply sorting
  images = images.sort((a, b) => {
    let aVal = a[sort];
    let bVal = b[sort];
    
    // Handle date sorting
    if (sort === 'uploadDate') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    // Handle size sorting
    if (sort === 'size') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  // Apply pagination
  const total = images.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedImages = images.slice(startIndex, endIndex);
  
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
};

exports.deleteImage = (id) => {
  return db.get('images').remove({ id }).write();
};

exports.updateImageTags = (id, tags) => {
  return db.get('images')
    .find({ id })
    .assign({ tags })
    .write();
};

exports.getImageById = (id) => {
  return db.get('images').find({ id }).value();
};

exports.searchImages = (query, owner, options = {}) => {
  const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
  
  let images = db.get('images')
    .filter(img => {
      if (img.owner !== owner) return false;
      const searchTerm = query.toLowerCase();
      
      // Check filename
      if (img.filename && img.filename.toLowerCase().includes(searchTerm)) return true;
      
      // Check tags (handle both string and array formats)
      if (img.tags) {
        if (Array.isArray(img.tags)) {
          return img.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        } else if (typeof img.tags === 'string') {
          return img.tags.toLowerCase().includes(searchTerm);
        }
      }
      
      return false;
    })
    .value();
    
  // Apply sorting and pagination
  return this.applySortingAndPagination(images, { page, limit, sort, order });
};

exports.filterImages = (filters, owner, options = {}) => {
  const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
  
  let images = db.get('images')
    .filter(img => {
      if (img.owner !== owner) return false;
      
      // Size filter
      if (filters.sizeRange) {
        const size = img.size || 0;
        if (filters.sizeRange === 'small' && size > 1024 * 1024) return false; // >1MB
        if (filters.sizeRange === 'medium' && (size < 1024 * 1024 || size > 5 * 1024 * 1024)) return false; // 1-5MB
        if (filters.sizeRange === 'large' && size < 5 * 1024 * 1024) return false; // >5MB
      }
      
      // Date filter
      if (filters.dateRange && img.uploadDate) {
        const uploadDate = new Date(img.uploadDate);
        const now = new Date();
        const daysDiff = (now - uploadDate) / (1000 * 60 * 60 * 24);
        
        if (filters.dateRange === 'today' && daysDiff > 1) return false;
        if (filters.dateRange === 'week' && daysDiff > 7) return false;
        if (filters.dateRange === 'month' && daysDiff > 30) return false;
      }
      
      // Tag category filter
      if (filters.captionCategory && img.tags) {
        const selectedCategory = filters.captionCategory.toLowerCase();
        // Check if the selected category exists in the image's tags array
        if (Array.isArray(img.tags)) {
          if (!img.tags.some(tag => tag.toLowerCase().includes(selectedCategory))) return false;
        }
      }
      
      // Owner filter
      if (filters.owner && img.owner !== filters.owner) return false;
      
      return true;
    })
    .value();
    
  // Apply sorting and pagination
  return this.applySortingAndPagination(images, { page, limit, sort, order });
};

exports.getTagCategories = (owner) => {
  const images = db.get('images').filter({ owner }).value();
  const categories = new Set();
  
  images.forEach(img => {
    if (img.tags && Array.isArray(img.tags)) {
      // Add each tag as category
      img.tags.forEach(tag => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          categories.add(cleanTag);
        }
      });
    }
  });
  
  return Array.from(categories).sort();
};

// Admin function: Get all images from all users
exports.getAllImages = (options = {}) => {
  const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
  
  let images = db.get('images').value();
  
  // Apply sorting
  images = images.sort((a, b) => {
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
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  // Apply pagination
  const total = images.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedImages = images.slice(startIndex, endIndex);
  
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
};

exports.updateImage = (id, updates) => {
  return db.get('images')
    .find({ id })
    .assign(updates)
    .write();
};

exports.applySortingAndPagination = (images, options) => {
  const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = options;
  
  // Apply sorting
  const sortedImages = images.sort((a, b) => {
    let aVal = a[sort];
    let bVal = b[sort];
    
    // Handle date sorting
    if (sort === 'uploadDate') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    // Handle size sorting
    if (sort === 'size') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    
    // Handle filename sorting
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
  
  // Apply pagination
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
};