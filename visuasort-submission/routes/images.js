const express = require('express');
const multer = require('multer');
const imageController = require('../controllers/imageController');
const authMiddleware = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

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
router.post('/stage', authMiddleware, upload.single('image'), imageController.stageImage);
router.post('/process/:imageId', authMiddleware, imageController.processStagedImage);

// Error handling middleware for multer
router.post('/upload', authMiddleware, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, imageController.uploadImage);
router.get('/', authMiddleware, imageController.getImages);
router.get('/search', authMiddleware, imageController.searchImages);
router.get('/filter', authMiddleware, imageController.filterImages);
router.get('/categories', authMiddleware, imageController.getTagCategories);
router.get('/admin/all', authMiddleware, imageController.getAllImagesAdmin);
router.delete('/admin/:id', authMiddleware, imageController.deleteImageAdmin);

router.post('/:id/process', authMiddleware, imageController.processImage);
router.post('/:id/enhance', authMiddleware, imageController.reEnhanceImage);
router.put('/:id', authMiddleware, imageController.updateImage);
router.patch('/:id', authMiddleware, imageController.patchImage);
router.get('/:id', authMiddleware, imageController.getImageById);
router.delete('/:id', authMiddleware, imageController.deleteImage);

module.exports = router;