const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
function generateAccessToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Find user by email and validate credentials
 * @param {object} prisma - Prisma client
 * @param {string} email - User email
 * @returns {object|null} User object or null
 */
async function findUserByEmail(prisma, email) {
  return await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      avatar: true,
      createdAt: true,
    }
  });
}

/**
 * Create new user
 * @param {object} prisma - Prisma client
 * @param {object} userData - User data
 * @returns {object} Created user
 */
async function createUser(prisma, userData) {
  return await prisma.user.create({
    data: userData,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      createdAt: true,
    }
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  findUserByEmail,
  createUser
};
