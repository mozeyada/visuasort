const jwt = require('jsonwebtoken');
const secretsService = require('../services/secretsService');

// Hardcoded users with roles (plain text for development)
const users = [
  { id: 1, username: 'admin', password: 'password', role: 'admin' },
  { id: 2, username: 'user', password: 'password', role: 'user' }
];

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userInfo = { id: user.id, username: user.username, role: user.role };
    const jwtSecret = await secretsService.getJwtSecret();
    const token = jwt.sign(userInfo, jwtSecret);
    res.json({ token, user: userInfo });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.register = (req, res) => {
  res.status(501).json({ error: 'Registration not implemented' });
};