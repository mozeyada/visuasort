require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

// Validate required environment variables
if (!process.env.IMAGGA_API_KEY || !process.env.IMAGGA_API_SECRET) {
  console.warn('Imagga API credentials missing - fallback to Hugging Face only');
}
if (!process.env.AI_API_KEY) {
  console.warn('Hugging Face API key missing - AI tagging may fail');
}

/**
 * Primary and fallback AI tagging service
 * Priority 1: Imagga API (most accurate)
 * Priority 2: Hugging Face API (fallback)
 * Priority 3: Empty array (graceful failure)
 */
exports.generateTagsWithFallback = async (imageBuffer) => {
  // Validate input
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    console.log('Invalid image buffer provided');
    return [];
  }

  // Try Imagga API first (Priority 1)
  try {
    console.log('Attempting Imagga API (Priority 1)...');
    const imaggaTags = await callImaggaAPIBuffer(imageBuffer);
    console.log('Imagga API succeeded:', imaggaTags);
    return imaggaTags;
  } catch (error) {
    console.log('Imagga API failed:', error.message);
  }

  // Fallback to Hugging Face API (Priority 2)
  try {
    console.log('Falling back to Hugging Face API (Priority 2)...');
    const huggingFaceTags = await callHuggingFaceAPIBuffer(imageBuffer);
    console.log('Hugging Face API succeeded:', huggingFaceTags);
    return huggingFaceTags;
  } catch (error) {
    console.log('Hugging Face API failed:', error.message);
  }

  // Graceful failure (Priority 3)
  console.log('All AI APIs failed, returning empty array');
  return [];
};

/**
 * Call Imagga API for image tagging with buffer
 */
async function callImaggaAPIBuffer(imageBuffer) {
  // Create form data for multipart upload
  const form = new FormData();
  form.append('image', imageBuffer, { filename: 'image.jpg' });
  
  const response = await axios.post('https://api.imagga.com/v2/tags', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Basic ${Buffer.from(`${process.env.IMAGGA_API_KEY}:${process.env.IMAGGA_API_SECRET}`).toString('base64')}`
    },
    timeout: 30000
  });

  // Extract top 2 tags from Imagga response
  if (response.data && response.data.result && response.data.result.tags) {
    return response.data.result.tags
      .slice(0, 2)
      .map(item => item.tag.en)
      .filter(tag => tag);
  }
  
  throw new Error('Invalid Imagga API response structure');
}

/**
 * Call Hugging Face API for image classification with buffer
 */
async function callHuggingFaceAPIBuffer(imageBuffer) {
  const response = await axios.post(process.env.AI_API_URL, imageBuffer, {
    headers: {
      'Authorization': `Bearer ${process.env.AI_API_KEY}`,
      'Content-Type': 'image/png'
    },
    timeout: 30000
  });

  // Extract top 2 labels from Hugging Face response
  if (response.data && Array.isArray(response.data) && response.data.length > 0) {
    return response.data
      .slice(0, 2)
      .map(item => item.label)
      .filter(label => label);
  }
  
  throw new Error('Invalid Hugging Face API response structure');
}

/**
 * Categorize tags into predefined categories
 */
exports.categorizeTag = (tag) => {
  const categories = {
    'People': ['person', 'man', 'woman', 'child', 'face', 'human'],
    'Nature': ['tree', 'flower', 'plant', 'landscape', 'mountain', 'sky'],
    'Objects': ['car', 'building', 'house', 'food', 'animal']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => tag.toLowerCase().includes(keyword))) {
      return category;
    }
  }
  
  return 'General';
};