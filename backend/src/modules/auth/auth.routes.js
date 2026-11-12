const express = require('express');
const router = express.Router();
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const authController = require('./auth.controller');
const { authenticateToken } = require('../../middleware/auth');

// Slow down credential-stuffing / brute-force attempts on login and signup.
// Keyed by IP (default), not by email, so it can't be used to lock a victim out.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Too many attempts, please try again later.' },
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', authLimiter, authController.login);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', authLimiter, authController.register);

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
 * DELETE /api/auth/profile
 * Delete user account (protected route)
 */
router.delete('/profile', authenticateToken, authController.deleteAccount);

/**
 * GET /api/auth/google
 * Initiate Google OAuth login
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

/**
 * GET /api/auth/google/connect
 * Connect Google Calendar
 */
router.get('/google/connect', (req, res, next) => {
  const options = {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/calendar'],
    accessType: 'offline',
    prompt: 'consent',
    state: 'connect_calendar'
  };

  if (req.query.login_hint) {
    options.loginHint = req.query.login_hint;
  }

  passport.authenticate('google', options)(req, res, next);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    // Must point to the frontend: a relative '/login' would resolve on the API host (404)
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`
  }),
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

/**
 * GET /api/auth/users/:userId
 * Get user profile by ID
 */
router.get('/users/:userId', authenticateToken, authController.getUserById);

module.exports = router;
