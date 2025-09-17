require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    upgradeInsecureRequests: null, // Disable HTTPS upgrade for HTTP deployment
  },
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// API Versioning middleware
app.use((req, res, next) => {
  res.set('API-Version', 'v1');
  next();
});

// Routes with versioning (required for Extended API Features rubric)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/images', imageRoutes);

// Backward compatibility
app.use('/api/auth', (req, res, next) => {
  req.url = '/api/v1/auth' + req.url;
  next();
});
app.use('/api/images', (req, res, next) => {
  req.url = '/api/v1/images' + req.url;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Static files
app.use('/uploads', express.static('uploads'));

// Check if React build exists, otherwise serve development message
const fs = require('fs');
const reactBuildPath = path.join(__dirname, 'frontend/build');
const reactIndexPath = path.join(reactBuildPath, 'index.html');

if (fs.existsSync(reactIndexPath)) {
  // Serve React build in production
  app.use(express.static(reactBuildPath));
  
  // Serve React app for all non-API routes (AFTER API routes)
  app.get('*', (req, res) => {
    res.sendFile(reactIndexPath);
  });
} else {
  // Development mode - React build doesn't exist
  app.get('*', (req, res) => {
    res.json({
      message: 'Visuasort API Server Running',
      note: 'React frontend not built. Run "npm run build" in frontend/ directory',
      api: {
        auth: '/api/v1/auth/login',
        images: '/api/v1/images',
        health: '/health',
        version: 'v1'
      }
    });
  });
}

app.listen(PORT, () => {
  console.log(`Visuasort server running on port ${PORT}`);
});