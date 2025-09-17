const imageService = require('../services/imageService');
const aiService = require('../services/aiService');
const dbService = require('../services/dbService');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// In-memory store for staged files
const stagedFiles = {};

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file path for security
    const uploadsDir = path.resolve('uploads');
    const filePath = path.resolve(req.file.path);
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Get processing options from request
    const enhanceOptions = {
      autoEnhance: req.body.autoEnhance === 'true',
      addWatermark: req.body.addWatermark === 'true',
      applyFilter: req.body.applyFilter || 'none',
      createThumbnail: true // Always create thumbnail
    };
    
    // CPU-intensive: Enhanced image processing
    const processedImages = await imageService.processImageEnhanced(req.file.path, enhanceOptions);
    
    const stats = fs.statSync(req.file.path);
    
    // Check if AI tagging is requested
    const useAI = req.body.useAI === 'true';
    
    // Use enhanced image as main image if processing was applied
    const hasEnhancements = enhanceOptions.autoEnhance || enhanceOptions.addWatermark || enhanceOptions.applyFilter !== 'none';
    const mainImagePath = hasEnhancements ? processedImages.enhancedPath : req.file.path;
    const mainImageFilename = hasEnhancements ? path.basename(processedImages.enhancedPath) : req.file.filename;
    
    // Create display name showing applied enhancements
    const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const enhancements = [];
    if (enhanceOptions.autoEnhance) enhancements.push('Enhanced');
    if (enhanceOptions.applyFilter !== 'none') enhancements.push(enhanceOptions.applyFilter.charAt(0).toUpperCase() + enhanceOptions.applyFilter.slice(1));
    if (enhanceOptions.addWatermark) enhancements.push('Watermarked');
    const displayName = enhancements.length > 0 ? `${originalName} (${enhancements.join(', ')})` : originalName;
    
    // Save metadata with enhanced image path
    const metadata = {
      id: Date.now().toString(),
      filename: mainImageFilename,
      displayName,
      originalPath: req.file.path,
      enhancedPath: processedImages.enhancedPath,
      thumbnailPath: processedImages.thumbnailPath,
      webPath: processedImages.webPath,
      tags: useAI ? ['processing...'] : ['Personal'], // Default to Personal
      uploadDate: new Date().toISOString(),
      size: stats.size,
      owner: req.user.username,
      hasEnhancements
    };

    dbService.saveImage(metadata);
    
    // Send immediate response
    res.status(202).json(metadata);
    
    // Only do AI processing if requested
    if (useAI) {
      aiService.generateTagsWithFallback(req.file.path)
        .then(tags => {
          dbService.updateImageTags(metadata.id, tags.length > 0 ? tags : ['no_tags_available']);
          console.log(`AI tags updated for ${encodeURIComponent(metadata.filename)}:`, tags.map(tag => encodeURIComponent(tag)));
        })
        .catch(error => {
          console.error(`AI tagging failed for image ${encodeURIComponent(metadata.filename)}:`, error.message);
          dbService.updateImageTags(metadata.id, ['tagging_failed']);
        });
    }
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: 'Upload failed' });
  }
};

exports.getImages = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    const images = dbService.getImages(req.user.username, { page: parseInt(page), limit: parseInt(limit), sort, order });
    
    res.json({
      data: images.data,
      pagination: images.pagination,
      sort: { field: sort, order }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
};

exports.getImageById = async (req, res) => {
  try {
    const image = dbService.getImageById(req.params.id);
    if (!image || image.owner !== req.user.username) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const image = dbService.getImageById(req.params.id);
    if (!image || image.owner !== req.user.username) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete files with path sanitization
    const uploadsDir = path.resolve('uploads');
    
    try {
      // Sanitize and validate file paths
      const mainFilePath = path.resolve(uploadsDir, path.basename(image.filename));
      if (mainFilePath.startsWith(uploadsDir)) {
        fs.unlinkSync(mainFilePath);
      }
      
      if (image.thumbnailPath) {
        const thumbPath = path.resolve(uploadsDir, path.basename(image.thumbnailPath));
        if (thumbPath.startsWith(uploadsDir)) {
          fs.unlinkSync(thumbPath);
        }
      }
    } catch (err) {
      console.log('File deletion warning:', err.message);
    }
    
    // Delete from database
    dbService.deleteImage(req.params.id);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

exports.searchImages = (req, res) => {
  try {
    const { query, page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const results = dbService.searchImages(query, req.user.username, { page: parseInt(page), limit: parseInt(limit), sort, order });
    res.json({
      data: results.data,
      pagination: results.pagination,
      query,
      sort: { field: sort, order }
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.filterImages = (req, res) => {
  try {
    const { sizeRange, dateRange, captionCategory, owner, page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    const results = dbService.filterImages({ sizeRange, dateRange, captionCategory, owner }, req.user.username, { page: parseInt(page), limit: parseInt(limit), sort, order });
    
    res.json({
      data: results.data,
      pagination: results.pagination,
      filters: { sizeRange, dateRange, captionCategory, owner },
      sort: { field: sort, order }
    });
  } catch (error) {
    res.status(500).json({ error: 'Filter failed' });
  }
};

exports.getTagCategories = (req, res) => {
  try {
    const categories = dbService.getTagCategories(req.user.username);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

// Admin-only: Get all images from all users
exports.getAllImagesAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    const images = dbService.getAllImages({ page: parseInt(page), limit: parseInt(limit), sort, order });
    
    res.json({
      data: images.data,
      pagination: images.pagination,
      sort: { field: sort, order }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all images' });
  }
};

// Admin-only: Delete any user's image
exports.deleteImageAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const image = dbService.getImageById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete files with path sanitization
    const uploadsDir = path.resolve('uploads');
    
    try {
      const mainFilePath = path.resolve(uploadsDir, path.basename(image.filename));
      if (mainFilePath.startsWith(uploadsDir)) {
        fs.unlinkSync(mainFilePath);
      }
      
      if (image.thumbnailPath) {
        const thumbPath = path.resolve(uploadsDir, path.basename(image.thumbnailPath));
        if (thumbPath.startsWith(uploadsDir)) {
          fs.unlinkSync(thumbPath);
        }
      }
    } catch (err) {
      console.log('File deletion warning:', err.message);
    }
    
    dbService.deleteImage(req.params.id);
    res.json({ message: `Image deleted by admin from user: ${image.owner}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

// CPU-intensive processing endpoint
exports.processImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = dbService.getImageById(imageId);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Trigger CPU-intensive processing
    const originalPath = path.join('uploads', image.filename);
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }
    
    // Intensive processing - multiple formats
    const processedImages = await imageService.processImage(originalPath);
    
    res.json({ 
      message: 'Processing complete',
      imageId,
      processed: processedImages
    });
    
  } catch (error) {
    console.error('Process image error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
};

// PUT - Update image metadata
exports.updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, tags } = req.body;
    
    const image = dbService.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (image.owner !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
    
    dbService.updateImage(id, updates);
    
    const updatedImage = dbService.getImageById(id);
    res.json(updatedImage);
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
};

// PATCH - Partial update image metadata
exports.patchImage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const image = dbService.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (image.owner !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only allow specific fields to be updated
    const allowedFields = ['displayName', 'tags'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    dbService.updateImage(id, filteredUpdates);
    
    const updatedImage = dbService.getImageById(id);
    res.json(updatedImage);
  } catch (error) {
    console.error('Patch image error:', error);
    res.status(500).json({ error: 'Failed to patch image' });
  }
};

// Load test staging endpoint
exports.stageImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided.' });
  }
  const imageId = uuidv4();
  // Save file with imageId as name so we can find it later
  const stagedPath = path.join('uploads', `staged_${imageId}.jpg`);
  fs.renameSync(req.file.path, stagedPath);
  res.status(201).json({ imageId });
};

// Load test processing endpoint
exports.processStagedImage = async (req, res) => {
  const { imageId } = req.params;
  const filePath = path.join('uploads', `staged_${imageId}.jpg`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Staged image not found.' });
  }
  
  try {
    const enhanceOptions = {
      autoEnhance: req.body.autoEnhance || true,
      addWatermark: req.body.addWatermark || true,
      applyFilter: req.body.applyFilter || 'dramatic',
      createThumbnail: true
    };
    
    await imageService.processImageEnhanced(filePath, enhanceOptions);
    
    // Don't delete the staged file - keep it for multiple processing requests (load testing)
    
    res.status(200).json({ message: 'Processing successful', imageId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process image.' });
  }
};

exports.reEnhanceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoEnhance, addWatermark, applyFilter } = req.body;
    
    const originalImage = dbService.getImageById(id);
    if (!originalImage) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (originalImage.owner !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const originalPath = originalImage.originalPath || path.join('uploads', originalImage.filename);
    if (!fs.existsSync(originalPath)) {
      return res.status(404).json({ error: 'Original image file not found' });
    }
    
    console.log('Received options:', { autoEnhance, addWatermark, applyFilter });
    
    const enhanceOptions = {
      autoEnhance: Boolean(autoEnhance),
      addWatermark: Boolean(addWatermark),
      applyFilter: applyFilter || 'none',
      createThumbnail: true
    };
    
    console.log('Processed options:', enhanceOptions);
    
    const processedImages = await imageService.processImageEnhanced(originalPath, enhanceOptions);
    
    // Extract clean original name
    const originalFilename = originalImage.originalPath ? 
      path.basename(originalImage.originalPath, path.extname(originalImage.originalPath)) :
      path.basename(originalImage.filename, path.extname(originalImage.filename));
    
    // Remove timestamp prefix to get clean name
    const cleanName = originalFilename.replace(/^\d+-/, '');
    
    const enhancements = [];
    if (enhanceOptions.autoEnhance) enhancements.push('Enhanced');
    if (enhanceOptions.applyFilter !== 'none') {
      const filterName = enhanceOptions.applyFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      enhancements.push(filterName);
    }
    if (enhanceOptions.addWatermark) enhancements.push('Watermarked');
    
    const displayName = enhancements.length > 0 ? `${cleanName} (${enhancements.join(', ')})` : cleanName;
    
    console.log('Generated display name:', displayName);
    
    // Create NEW image entry instead of updating existing
    const newImageMetadata = {
      id: Date.now().toString(),
      filename: path.basename(processedImages.enhancedPath),
      displayName,
      originalPath: originalImage.originalPath || `uploads/${originalImage.filename}`, // Link to same original
      enhancedPath: processedImages.enhancedPath,
      thumbnailPath: processedImages.thumbnailPath,
      webPath: processedImages.webPath,
      tags: originalImage.tags, // Copy tags from original
      uploadDate: new Date().toISOString(),
      size: originalImage.size,
      owner: originalImage.owner,
      hasEnhancements: true
    };
    
    console.log('Saving new image metadata:', newImageMetadata);
    
    dbService.saveImage(newImageMetadata);
    
    res.json({ message: 'New enhanced version created successfully' });
  } catch (error) {
    console.error('Re-enhance error:', error);
    res.status(500).json({ error: 'Failed to re-enhance image' });
  }
};

