const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /api/auth/profile
 * Get current user profile (protected route)
 */
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;
