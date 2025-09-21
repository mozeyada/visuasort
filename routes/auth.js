const express = require('express');
const cognitoController = require('../controllers/cognitoController');

const router = express.Router();

// Cognito authentication (Assessment 2 requirement)
router.post('/register', cognitoController.register);
router.post('/confirm', cognitoController.confirmRegistration);
router.post('/login', cognitoController.login);
router.get('/verify', cognitoController.verifyToken);

module.exports = router;