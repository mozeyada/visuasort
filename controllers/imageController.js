const imageService = require('../services/imageService');
const aiService = require('../services/aiService');
const dbService = require('../services/dbService');
const s3Service = require('../services/s3Service');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Stateless design - no in-memory storage

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const userId = req.user.sub; // Use Cognito sub (UUID) consistently
    const imageId = Date.now().toString(); // Use full timestamp to match S3 structure
    
    // Get processing options from request
    const enhanceOptions = {
      autoEnhance: req.body.autoEnhance === 'true',
      addWatermark: req.body.addWatermark === 'true',
      applyFilter: req.body.applyFilter || 'none',
      createThumbnail: true
    };
    
    // Upload original to S3
    const originalKey = await s3Service.uploadImage(
      userId, 
      imageId, 
      req.file.buffer, 
      'original',
      'jpg'
    );
    
    // Process image with S3
    const processedImages = await imageService.processImageEnhancedS3(
      originalKey, 
      userId, 
      imageId, 
      enhanceOptions
    );
    
    const fileSize = req.file.size;
    const useAI = req.body.useAI === 'true';
    
    // Create display name
    const originalFilename = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const enhancements = [];
    if (enhanceOptions.autoEnhance) enhancements.push('Enhanced');
    if (enhanceOptions.applyFilter !== 'none') enhancements.push(enhanceOptions.applyFilter.charAt(0).toUpperCase() + enhanceOptions.applyFilter.slice(1));
    if (enhanceOptions.addWatermark) enhancements.push('Watermarked');
    const displayName = enhancements.length > 0 ? `${originalFilename} (${enhancements.join(', ')})` : originalFilename;
    
    const metadata = {
      id: imageId,
      filename: req.file.originalname,
      displayName,
      originalKey: originalKey,
      enhancedKey: processedImages.enhancedKey,
      thumbnailKey: processedImages.thumbnailKey,
      webKey: processedImages.webKey,
      tags: useAI ? ['processing...'] : ['Personal'],
      uploadDate: new Date().toISOString(),
      size: fileSize,
      owner: userId, // Use same identifier as S3 for consistency
      hasEnhancements: enhanceOptions.autoEnhance || enhanceOptions.addWatermark || enhanceOptions.applyFilter !== 'none'
    };

    await dbService.saveImage(metadata);
    res.status(202).json(metadata);
    
    // AI processing if requested
    if (useAI) {
      s3Service.getImageBuffer(originalKey)
        .then(buffer => aiService.generateTagsWithFallback(buffer))
        .then(async (tags) => {
          await dbService.updateImageTags(metadata.id, tags.length > 0 ? tags : ['no_tags_available']);
        })
        .catch(async (error) => {
          console.error(`AI tagging failed:`, error.message);
          await dbService.updateImageTags(metadata.id, ['tagging_failed']);
        });
    }
  } catch (error) {
    console.error('Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getImages = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    const userId = req.user.sub;
    const images = await dbService.getImages(userId, { page: parseInt(page), limit: parseInt(limit), sort, order });
    
    // Add S3 URLs for frontend with error handling
    const imagesWithUrls = await Promise.all(images.data.map(async (image) => {
      const imageWithUrls = { ...image };
      try {
        if (image.originalKey) {
          imageWithUrls.originalUrl = await s3Service.getPresignedUrl(image.originalKey);
        }
        if (image.enhancedKey) {
          imageWithUrls.enhancedUrl = await s3Service.getPresignedUrl(image.enhancedKey);
        }
        if (image.thumbnailKey) {
          imageWithUrls.thumbnailUrl = await s3Service.getPresignedUrl(image.thumbnailKey);
        }
        if (image.webKey) {
          imageWithUrls.webUrl = await s3Service.getPresignedUrl(image.webKey);
        }
      } catch (error) {
        console.warn(`Failed to generate presigned URLs for image ${image.id}:`, error.message);
      }
      return imageWithUrls;
    }));
    
    res.json({
      data: imagesWithUrls,
      pagination: images.pagination,
      sort: { field: sort, order }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
};

exports.getImageById = async (req, res) => {
  try {
    const userId = req.user.sub;
    const image = await dbService.getImageById(req.params.id, userId);
    if (!image || image.owner !== userId) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Add S3 URLs
    const imageWithUrls = { ...image };
    if (image.originalKey) {
      imageWithUrls.originalUrl = await s3Service.getPresignedUrl(image.originalKey);
    }
    if (image.enhancedKey) {
      imageWithUrls.enhancedUrl = await s3Service.getPresignedUrl(image.enhancedKey);
    }
    if (image.thumbnailKey) {
      imageWithUrls.thumbnailUrl = await s3Service.getPresignedUrl(image.thumbnailKey);
    }
    if (image.webKey) {
      imageWithUrls.webUrl = await s3Service.getPresignedUrl(image.webKey);
    }
    
    res.json(imageWithUrls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch image' });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const userId = req.user.sub;
    const image = await dbService.getImageById(req.params.id, userId);
    if (!image || image.owner !== userId) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete from S3 if using S3 storage
    try {
      if (image.originalKey) {
        await s3Service.deleteImage(image.originalKey);
      }
      if (image.enhancedKey) {
        await s3Service.deleteImage(image.enhancedKey);
      }
      if (image.thumbnailKey) {
        await s3Service.deleteImage(image.thumbnailKey);
      }
      if (image.webKey) {
        await s3Service.deleteImage(image.webKey);
      }
    } catch (err) {
      console.log('S3 deletion warning:', err.message);
    }
    
    // Delete from database
    await dbService.deleteImage(req.params.id, userId);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

exports.searchImages = async (req, res) => {
  try {
    const { query, page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    const results = await dbService.searchImages(query, req.user.sub, { page: parseInt(page), limit: parseInt(limit), sort, order });
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

exports.filterImages = async (req, res) => {
  try {
    const { sizeRange, dateRange, captionCategory, owner, page = 1, limit = 10, sort = 'uploadDate', order = 'desc' } = req.query;
    const results = await dbService.filterImages({ sizeRange, dateRange, captionCategory, owner }, req.user.sub, { page: parseInt(page), limit: parseInt(limit), sort, order });
    
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

exports.getTagCategories = async (req, res) => {
  try {
    const categories = await dbService.getTagCategories(req.user.sub);
    res.json(categories || []);
  } catch (error) {
    console.error('Failed to retrieve tag categories:', error);
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
    const images = await dbService.getAllImages({ page: parseInt(page), limit: parseInt(limit), sort, order, owner: null });
    
    // Add S3 URLs for admin view with error handling
    const imagesWithUrls = await Promise.all(images.data.map(async (image) => {
      const imageWithUrls = { ...image };
      try {
        if (image.originalKey) {
          imageWithUrls.originalUrl = await s3Service.getPresignedUrl(image.originalKey);
        }
        if (image.enhancedKey) {
          imageWithUrls.enhancedUrl = await s3Service.getPresignedUrl(image.enhancedKey);
        }
        if (image.thumbnailKey) {
          imageWithUrls.thumbnailUrl = await s3Service.getPresignedUrl(image.thumbnailKey);
        }
        if (image.webKey) {
          imageWithUrls.webUrl = await s3Service.getPresignedUrl(image.webKey);
        }
      } catch (error) {
        console.warn(`Failed to generate presigned URLs for image ${image.id}:`, error.message);
        // Set placeholder URLs or leave undefined
      }
      return imageWithUrls;
    }));
    
    res.json({
      data: imagesWithUrls,
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
    
    // First scan to find the image since admin doesn't know the owner
    const image = await dbService.getImageById(req.params.id, null);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete from S3 if using S3 storage
    try {
      if (image.originalKey) {
        await s3Service.deleteImage(image.originalKey);
      }
      if (image.enhancedKey) {
        await s3Service.deleteImage(image.enhancedKey);
      }
      if (image.thumbnailKey) {
        await s3Service.deleteImage(image.thumbnailKey);
      }
      if (image.webKey) {
        await s3Service.deleteImage(image.webKey);
      }
    } catch (err) {
      console.log('S3 deletion warning:', err.message);
    }
    
    await dbService.deleteImage(req.params.id, image.owner);
    res.json({ message: `Image deleted by admin from user: ${image.owner}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

// CPU-intensive processing endpoint
exports.processImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await dbService.getImageById(imageId, req.user.sub);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (!image.originalKey) {
      return res.status(404).json({ error: 'Image not found in S3' });
    }
    
    // Get image from S3 and process
    const imageBuffer = await s3Service.getImageBuffer(image.originalKey);
    await imageService.processImageEnhancedBuffer(imageBuffer, {
      autoEnhance: true,
      addWatermark: true,
      applyFilter: 'dramatic'
    });
    
    res.json({ 
      message: 'Processing complete',
      imageId
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
    
    const image = await dbService.getImageById(id, req.user.sub);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (image.owner !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [tags];
    
    await dbService.updateImage(id, image.owner, updates);
    
    const updatedImage = await dbService.getImageById(id, image.owner);
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
    
    const image = await dbService.getImageById(id, req.user.sub);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (image.owner !== req.user.sub && req.user.role !== 'admin') {
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
    
    await dbService.updateImage(id, image.owner, filteredUpdates);
    
    const updatedImage = await dbService.getImageById(id, image.owner);
    res.json(updatedImage);
  } catch (error) {
    console.error('Patch image error:', error);
    res.status(500).json({ error: 'Failed to patch image' });
  }
};

// Load test staging endpoint - stateless using S3
exports.stageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }
    const imageId = uuidv4();
    const userId = req.user.sub;
    
    // Store in S3 instead of memory for statelessness
    const stagingKey = await s3Service.uploadImage(
      userId, 
      imageId, 
      req.file.buffer, 
      'staging',
      'jpg'
    );
    
    res.status(201).json({ imageId, stagingKey });
  } catch (error) {
    res.status(500).json({ message: 'Failed to stage image.' });
  }
};

// Load test processing endpoint - stateless using S3
exports.processStagedImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.sub;
    
    // Get staged image from S3
    const stagingKey = `${imageId}/staging.jpg`;
    const imageBuffer = await s3Service.getImageBuffer(stagingKey);
    
    if (!imageBuffer) {
      return res.status(404).json({ message: 'Staged image not found.' });
    }
    
    const enhanceOptions = {
      autoEnhance: req.body.autoEnhance || true,
      addWatermark: req.body.addWatermark || true,
      applyFilter: req.body.applyFilter || 'dramatic',
      createThumbnail: true
    };
    
    await imageService.processImageEnhancedBuffer(imageBuffer, enhanceOptions);
    
    res.status(200).json({ message: 'Processing successful', imageId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to process image.' });
  }
};

exports.reEnhanceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoEnhance, addWatermark, applyFilter } = req.body;
    
    const originalImage = await dbService.getImageById(id, req.user.sub);
    if (!originalImage) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (originalImage.owner !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!originalImage.originalKey) {
      return res.status(404).json({ error: 'Original image not found in S3' });
    }
    
    const enhanceOptions = {
      autoEnhance: Boolean(autoEnhance),
      addWatermark: Boolean(addWatermark),
      applyFilter: applyFilter || 'none',
      createThumbnail: true
    };
    
    const userId = originalImage.owner;
    const newImageId = Date.now().toString();
    
    // Process with S3
    const processedImages = await imageService.processImageEnhancedS3(
      originalImage.originalKey,
      userId,
      newImageId,
      enhanceOptions
    );
    
    // Create display name
    const originalFilename = path.basename(originalImage.filename, path.extname(originalImage.filename));
    const cleanName = originalFilename.replace(/^\d+-/, '');
    
    const enhancements = [];
    if (enhanceOptions.autoEnhance) enhancements.push('Enhanced');
    if (enhanceOptions.applyFilter !== 'none') {
      const filterName = enhanceOptions.applyFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      enhancements.push(filterName);
    }
    if (enhanceOptions.addWatermark) enhancements.push('Watermarked');
    
    const displayName = enhancements.length > 0 ? `${cleanName} (${enhancements.join(', ')})` : cleanName;
    
    // Create new S3-based image entry
    const newImageMetadata = {
      id: newImageId,
      filename: originalImage.filename,
      displayName,
      originalKey: originalImage.originalKey,
      enhancedKey: processedImages.enhancedKey,
      thumbnailKey: processedImages.thumbnailKey,
      webKey: processedImages.webKey,
      tags: originalImage.tags,
      uploadDate: new Date().toISOString(),
      size: originalImage.size,
      owner: originalImage.owner,
      hasEnhancements: true
    };
    
    await dbService.saveImage(newImageMetadata);
    
    res.json({ message: 'New enhanced version created successfully' });
  } catch (error) {
    console.error('Re-enhance error:', error);
    res.status(500).json({ error: 'Failed to re-enhance image' });
  }
};

// Get pre-signed URL for direct client upload
exports.getPresignedUploadUrl = async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    const userId = req.user.sub;
    const imageId = Date.now().toString();
    
    const key = `${userId}/${imageId}-original.jpg`;
    
    const uploadUrl = await s3Service.getPresignedUploadUrl(key, contentType);
    
    res.json({
      uploadUrl,
      key,
      imageId
    });
  } catch (error) {
    console.error('Presigned upload URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

// Get pre-signed URL for image download
exports.getPresignedDownloadUrl = async (req, res) => {
  try {
    const image = await dbService.getImageById(req.params.id, req.user.sub);
    if (!image || image.owner !== req.user.sub) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (!image.originalKey) {
      return res.status(404).json({ error: 'Image not found in S3' });
    }
    
    const downloadUrl = await s3Service.getPresignedUrl(image.originalKey, 3600);
    
    res.json({ downloadUrl });
  } catch (error) {
    console.error('Presigned download URL error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
};

