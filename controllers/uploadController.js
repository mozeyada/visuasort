const imageService = require('../services/imageService');
const aiService = require('../services/aiService');
const dbService = require('../services/dbService');
const s3Service = require('../services/s3Service');
const path = require('path');

exports.uploadComplete = async (req, res) => {
  try {
    const { key, imageId, filename, size, useAI, autoEnhance, addWatermark, applyFilter } = req.body;
    const userId = req.user.username;
    
    // Get processing options
    const enhanceOptions = {
      autoEnhance: autoEnhance === 'true' || autoEnhance === true,
      addWatermark: addWatermark === 'true' || addWatermark === true,
      applyFilter: applyFilter || 'none',
      createThumbnail: true
    };
    
    // Process image with S3
    const processedImages = await imageService.processImageEnhancedS3(
      key, 
      userId, 
      imageId, 
      enhanceOptions
    );
    
    // Create display name
    const originalFilename = path.basename(filename, path.extname(filename));
    const enhancements = [];
    if (enhanceOptions.autoEnhance) enhancements.push('Enhanced');
    if (enhanceOptions.applyFilter !== 'none') enhancements.push(enhanceOptions.applyFilter.charAt(0).toUpperCase() + enhanceOptions.applyFilter.slice(1));
    if (enhanceOptions.addWatermark) enhancements.push('Watermarked');
    const displayName = enhancements.length > 0 ? `${originalFilename} (${enhancements.join(', ')})` : originalFilename;
    
    const metadata = {
      id: imageId,
      filename: filename,
      displayName,
      originalKey: key,
      enhancedKey: processedImages.enhancedKey,
      thumbnailKey: processedImages.thumbnailKey,
      webKey: processedImages.webKey,
      tags: useAI ? ['processing...'] : ['Personal'],
      uploadDate: new Date().toISOString(),
      size: size,
      owner: req.user.username,
      hasEnhancements: enhanceOptions.autoEnhance || enhanceOptions.addWatermark || enhanceOptions.applyFilter !== 'none'
    };

    await dbService.saveImage(metadata);
    res.status(202).json(metadata);
    
    // AI processing if requested
    if (useAI) {
      s3Service.getImageBuffer(key)
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
    console.error('Upload complete error:', error.message);
    res.status(500).json({ error: error.message });
  }
};