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
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        console.error('Passport Google Error:', err);
        return res.status(500).json({ error: 'Passport Error', details: err.message });
      }
      if (!user) {
        console.error('Passport Google Failed (No User):', info);
        return res.status(401).json({ error: 'Unauthorized', details: info });
      }
      req.user = user;
      next();
    })(req, res, next);
  },
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
