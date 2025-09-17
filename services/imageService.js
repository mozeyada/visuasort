const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Optimize Sharp for t3.micro (2 vCPUs)
sharp.concurrency(2);
sharp.cache(false); // Reduce memory usage for better CPU utilization

// Auto-enhance with image analysis (VERY CPU intensive)
const autoEnhance = async (inputBuffer) => {
  const metadata = await sharp(inputBuffer).metadata();
  const stats = await sharp(inputBuffer).stats();
  
  const avgBrightness = stats.channels[0].mean / 255;
  const brightnessAdjust = avgBrightness < 0.4 ? 1.15 : (avgBrightness > 0.7 ? 0.95 : 1.05);
  const saturationAdjust = avgBrightness < 0.3 ? 1.2 : 1.1;
  
  // Multiple heavy processing passes to maximize CPU usage
  let processedBuffer = await sharp(inputBuffer)
    .rotate() // EXIF orientation
    .resize(2500, 2500, { fit: 'inside', withoutEnlargement: false }) // Force large resize
    .blur(4) // Heavy Gaussian blur (very CPU intensive)
    .sharpen(3, 1, 4) // Heavy sharpening
    .normalize() // Histogram normalization
    .modulate({
      brightness: brightnessAdjust,
      saturation: saturationAdjust,
      hue: 10
    })
    .gamma(1.1)
    .toBuffer();
    
  // Second pass for even more CPU work
  processedBuffer = await sharp(processedBuffer)
    .blur(2) // Another blur pass
    .sharpen(2, 1, 3) // More sharpening
    .modulate({ brightness: 1.02, saturation: 1.05 })
    .convolve({ // Custom convolution kernel (very CPU intensive)
      width: 3,
      height: 3,
      kernel: [-1, -1, -1, -1, 9, -1, -1, -1, -1]
    })
    .toBuffer();
    
  // Third pass for maximum CPU load
  return await sharp(processedBuffer)
    .blur(1)
    .sharpen(1.5, 1, 2)
    .normalize()
    .toBuffer();
};

// Apply artistic filters (VERY CPU intensive with multiple passes)
const applyFilter = async (inputBuffer, filterType) => {
  const image = sharp(inputBuffer);
  
  switch (filterType) {
    case 'vintage':
      // Multi-pass vintage effect with heavy processing
      let vintageBuffer = await image
        .blur(3) // Heavy blur first
        .tint({ r: 255, g: 220, b: 180 })
        .modulate({ brightness: 0.95, saturation: 0.7, hue: 15 })
        .gamma(1.3)
        .convolve({ width: 3, height: 3, kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0] })
        .toBuffer();
      // Second pass
      return await sharp(vintageBuffer)
        .blur(1)
        .sharpen(2, 1, 2)
        .modulate({ brightness: 1.02, saturation: 0.95 })
        .toBuffer();
        
    case 'dramatic':
      // Multi-pass dramatic effect with maximum CPU load
      let dramaticBuffer = await image
        .blur(5) // Very heavy blur
        .normalize()
        .sharpen(5, 1, 6) // Very heavy sharpening
        .modulate({ brightness: 0.9, saturation: 1.5, hue: -5 })
        .gamma(1.2)
        .convolve({ width: 3, height: 3, kernel: [-2, -1, 0, -1, 1, 1, 0, 1, 2] })
        .toBuffer();
      // Second pass for more CPU work
      dramaticBuffer = await sharp(dramaticBuffer)
        .blur(2)
        .sharpen(3, 1, 4)
        .modulate({ brightness: 0.98, saturation: 1.1 })
        .toBuffer();
      // Third pass for maximum load
      return await sharp(dramaticBuffer)
        .normalize()
        .sharpen(1, 1, 1)
        .toBuffer();
        
    case 'bw_artistic':
      // Multi-pass B&W effect with heavy processing
      let bwBuffer = await image
        .blur(4)
        .grayscale()
        .normalize()
        .sharpen(3, 1, 4)
        .gamma(1.1)
        .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
        .toBuffer();
      // Second pass
      return await sharp(bwBuffer)
        .blur(1)
        .sharpen(2, 1, 3)
        .modulate({ brightness: 1.05 })
        .toBuffer();
        
    case 'soft_portrait':
      // Multi-pass soft portrait with heavy blur operations
      let softBuffer = await image
        .blur(3) // Much heavier blur
        .sharpen(2, 1, 3)
        .modulate({ brightness: 1.02, saturation: 0.9 })
        .convolve({ width: 3, height: 3, kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1] })
        .toBuffer();
      // Second pass
      return await sharp(softBuffer)
        .blur(1.5)
        .sharpen(1, 1, 2)
        .toBuffer();
        
    default:
      return inputBuffer;
  }
};

// Add watermark
const addWatermark = async (inputBuffer, watermarkText = 'VISUASORT') => {
  console.log('Adding watermark:', watermarkText);
  
  // Get image dimensions
  const { width, height } = await sharp(inputBuffer).metadata();
  
  // Create realistic watermark sizing that fits within image bounds
  const maxWatermarkWidth = Math.min(width * 0.4, width - 20); // Max 40% of width, leave 20px margin
  const watermarkWidth = Math.max(Math.min(width * 0.12, maxWatermarkWidth), Math.min(250, maxWatermarkWidth));
  const watermarkHeight = Math.min(watermarkWidth * 0.3, height * 0.2); // Max 20% of image height
  const fontSize = Math.max(watermarkWidth * 0.12, 16);
  
  const watermarkBuffer = await sharp({
    create: {
      width: Math.round(watermarkWidth),
      height: Math.round(watermarkHeight),
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.7 }
    }
  })
  .png()
  .toBuffer();
  
  // Create text overlay using SVG with responsive font size
  const textSvg = `<svg width="${Math.round(watermarkWidth)}" height="${Math.round(watermarkHeight)}">
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.round(fontSize)}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${watermarkText}</text>
  </svg>`;
  
  const textBuffer = Buffer.from(textSvg);
  
  // Composite background and text
  const finalWatermark = await sharp(watermarkBuffer)
    .composite([{ input: textBuffer, blend: 'over' }])
    .png()
    .toBuffer();
  
  const result = await sharp(inputBuffer)
    .composite([{
      input: finalWatermark,
      gravity: 'southeast',
      blend: 'over'
    }])
    .toBuffer();
    
  console.log('Watermark applied with dimensions:', Math.round(watermarkWidth), 'x', Math.round(watermarkHeight), 'font:', Math.round(fontSize));
  return result;
};

// Enhanced processing with professional features
exports.processImageEnhanced = async (imagePath, options = {}) => {
  console.log('Processing options:', options);
  
  const inputBuffer = fs.readFileSync(imagePath);
  const originalFilename = path.basename(imagePath, path.extname(imagePath));
  
  // Clean filename - remove existing timestamp if present
  const cleanFilename = originalFilename.replace(/^\d+-/, '');
  const timestamp = Date.now();
  const filename = `${timestamp}-${cleanFilename}`;
  const uploadsDir = 'uploads';
  
  // Start with heavy initial processing to maximize CPU load
  let processedBuffer = await sharp(inputBuffer)
    .rotate() // EXIF orientation
    .resize(2200, 2200, { fit: 'inside', withoutEnlargement: false }) // Force larger processing
    .blur(3) // Heavy initial blur for more CPU work
    .sharpen(2, 1, 3) // Heavy initial sharpening
    .normalize() // Histogram normalization
    .toBuffer();
  
  const results = {};
  
  if (options.autoEnhance) {
    console.log('Applying auto-enhancement...');
    processedBuffer = await autoEnhance(processedBuffer);
  }
  
  if (options.applyFilter && options.applyFilter !== 'none') {
    console.log(`Applying ${options.applyFilter} filter...`);
    processedBuffer = await applyFilter(processedBuffer, options.applyFilter);
  }
  
  if (options.addWatermark) {
    console.log('Adding watermark...');
    processedBuffer = await addWatermark(processedBuffer);
  }
  
  const thumbnailPath = path.join(uploadsDir, `${filename}_thumb.jpg`);
  const thumbnailBuffer = await sharp(processedBuffer)
    .resize(200, 200, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Apply watermark to thumbnail if requested
  if (options.addWatermark) {
    await sharp(await addWatermark(thumbnailBuffer, 'VISUASORT')).toFile(thumbnailPath);
  } else {
    await sharp(thumbnailBuffer).toFile(thumbnailPath);
  }
  results.thumbnailPath = thumbnailPath;
  
  const enhancedPath = path.join(uploadsDir, `${filename}_enhanced.jpg`);
  await sharp(processedBuffer)
    .jpeg({ quality: 90 })
    .toFile(enhancedPath);
  results.enhancedPath = enhancedPath;
  
  const webPath = path.join(uploadsDir, `${filename}_web.webp`);
  await sharp(processedBuffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(webPath);
  results.webPath = webPath;
  
  return results;
};

// Backward compatibility
exports.processImage = async (imagePath) => {
  return exports.processImageEnhanced(imagePath, {
    autoEnhance: false,
    addWatermark: false,
    applyFilter: 'none'
  });
};