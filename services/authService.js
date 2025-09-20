const jwt = require('jsonwebtoken');
const secretsService = require('./secretsService');

const users = [
  { username: 'admin', password: 'password', role: 'admin' },
  // amazonq-ignore-next-line
  { username: 'user', password: 'password', role: 'user' }
];

exports.validateUser = (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  return user ? { valid: true, user: { username: user.username, role: user.role } } : { valid: false };
};

exports.generateToken = async (user) => {
  const jwtSecret = await secretsService.getJwtSecret();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not available from Secrets Manager or environment');
  }
  return jwt.sign(user, jwtSecret, { expiresIn: '24h' });
};

exports.verifyToken = async (token) => {
  try {
    const jwtSecret = await secretsService.getJwtSecret();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not available from Secrets Manager or environment');
    }
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
};