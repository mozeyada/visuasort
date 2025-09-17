const jwt = require('jsonwebtoken');

const users = [
  { username: 'admin', password: 'password', role: 'admin' },
  // amazonq-ignore-next-line
  { username: 'user', password: 'password', role: 'user' }
];

exports.validateUser = (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  return user ? { valid: true, user: { username: user.username, role: user.role } } : { valid: false };
};

exports.generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '24h' });
};

exports.verifyToken = (token) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};