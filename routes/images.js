const express = require('express');
const multer = require('multer');
const imageController = require('../controllers/imageController');
const cognitoAuth = require('../middleware/cognitoAuth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.log(`❌ File rejected - MIME type: ${file.mimetype}, Original name: ${file.originalname}`);
      cb(new Error(`Only image files allowed. Received: ${file.mimetype}`));
    }
  }
});

// Load test endpoints
router.post('/stage', cognitoAuth, upload.single('image'), imageController.stageImage);
router.post('/process/:imageId', cognitoAuth, imageController.processStagedImage);

// Error handling middleware for multer
router.post('/upload', cognitoAuth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, imageController.uploadImage);
router.get('/', cognitoAuth, imageController.getImages);
router.get('/search', cognitoAuth, imageController.searchImages);
router.get('/filter', cognitoAuth, imageController.filterImages);
router.get('/categories', cognitoAuth, imageController.getTagCategories);
router.get('/admin/all', cognitoAuth, imageController.getAllImagesAdmin);
router.delete('/admin/:id', cognitoAuth, imageController.deleteImageAdmin);

router.post('/:id/process', cognitoAuth, imageController.processImage);
router.post('/:id/enhance', cognitoAuth, imageController.reEnhanceImage);
router.put('/:id', cognitoAuth, imageController.updateImage);
router.patch('/:id', cognitoAuth, imageController.patchImage);
router.get('/:id', cognitoAuth, imageController.getImageById);
router.delete('/:id', cognitoAuth, imageController.deleteImage);

// Pre-signed URL endpoints for Assessment 2
router.post('/presigned-upload', cognitoAuth, imageController.getPresignedUploadUrl);
router.post('/upload-complete', cognitoAuth, imageController.uploadComplete);
router.get('/:id/presigned-url', cognitoAuth, imageController.getPresignedDownloadUrl);

module.exports = router;