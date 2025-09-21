const cognitoService = require('../services/cognitoService');

exports.register = async (req, res) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password || !email) {
      return res.status(400).json({ 
        error: 'Username, password, and email are required' 
      });
    }

    const result = await cognitoService.signUp(username, password, email, role);
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
};

exports.confirmRegistration = async (req, res) => {
  try {
    const { username, confirmationCode } = req.body;
    
    if (!username || !confirmationCode) {
      return res.status(400).json({ 
        error: 'Username and confirmation code are required' 
      });
    }

    const result = await cognitoService.confirmSignUp(username, confirmationCode);
    res.json(result);
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(400).json({ error: error.message || 'Confirmation failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    const result = await cognitoService.authenticate(username, password);
    res.json({
      token: result.tokens.idToken,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Login failed' });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const result = await cognitoService.verifyToken(token);
    
    if (result.valid) {
      res.json({ valid: true, user: result.user });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false, error: error.message });
  }
};