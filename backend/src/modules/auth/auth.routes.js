const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middleware/auth');

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
 * POST /api/auth/verify
 * Verify email with token
 */
router.post('/verify', authController.verify);

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

/**
 * PUT /api/auth/profile
 * Update current user profile (protected route)
 */
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * GET /api/auth/google
 * Initiate Google OAuth login
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

/**
 * POST /api/auth/google/complete
 * Complete Google OAuth registration (create user with password)
 */
router.post('/google/complete', authController.completeGoogleLogin);

/**
 * POST /api/auth/set-password
 * Set password for Google users
 */
router.post('/set-password', authenticateToken, authController.setPassword);

module.exports = router;
