const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const authService = require('./auth.service');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../utils/mailer');

/**
 * Login controller
 * Validates credentials and returns JWT tokens
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Email and password are required' 
      });
    }

    // Find user
    const user = await authService.findUserByEmail(prisma, email);

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Invalid email or password' 
      });
    }

    // Generate tokens
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: 'Internal server error' 
    });
  }
}

/**
 * Register controller
 * Creates a new user account
 */
async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Email, password, and name are required' 
      });
    }

    // Check password strength
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await authService.findUserByEmail(prisma, email);

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Registration failed',
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const verificationToken = crypto.randomUUID();
    
    const user = await authService.createUser(prisma, {
      email,
      password: hashedPassword,
      name,
      verificationToken,
      isVerified: false
    });

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify?token=${verificationToken}`;
    
    await sendEmail(
      email,
      'Verify your email',
      `<p>Please click the following link to verify your email:</p><a href="${verificationLink}">${verificationLink}</a>`
    );

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: 'Internal server error' 
    });
  }
}

/**
 * Refresh token controller
 * Issues new access token using refresh token
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Refresh token is required' 
      });
    }

    // Verify refresh token
    const decoded = authService.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is not a refresh token' 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found' 
      });
    }

    // Generate new access token
    const newAccessToken = authService.generateAccessToken(user.id);

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Token refresh failed',
      message: 'Internal server error' 
    });
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    // User is already attached by authenticateToken middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to get profile',
      message: 'Internal server error' 
    });
  }
}

/**
 * Update current user profile
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, avatar, currentPassword, newPassword } = req.body;

    const updateData = {};
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (name) updateData.name = name;

    // If a new avatar is provided, delete the old one first.
    if (avatar !== undefined) {
      if (currentUser.avatar && currentUser.avatar !== avatar) {
        const oldAvatarPath = path.join(__dirname, '../../public', currentUser.avatar);
        fs.unlink(oldAvatarPath, (err) => {
          if (err) console.error(`Failed to delete old avatar: ${oldAvatarPath}`, err);
        });
      }
      updateData.avatar = avatar;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Current password is required to set a new password'
        });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);

      if (!isPasswordValid) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Incorrect current password'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'New password must be at least 6 characters long'
        });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
}

/**
 * Verify email controller
 */
async function verify(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Token is required'
      });
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Verification failed',
        message: 'Invalid or expired token'
      });
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null
      }
    });

    // Generate tokens for immediate login
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    res.json({
      message: 'Email verified successfully',
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'Internal server error'
    });
  }
}

/**
 * Google OAuth callback controller
 */
async function googleCallback(req, res) {
  try {
    const user = req.user;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // If it's a new user (not in DB yet)
    if (user.isNewUser) {
      // Generate a temporary registration token containing the Google profile info
      // We use a short expiration time for security
      const tempToken = jwt.sign(
        { 
          email: user.email,
          name: user.name,
          googleId: user.googleId,
          avatar: user.avatar,
          type: 'google_registration'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.redirect(`${frontendUrl}/google-callback?tempToken=${tempToken}&isNewUser=true`);
    }

    // Existing user flow
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    // Check if user needs to set a password (if password is null)
    if (!user.password) {
      return res.redirect(`${frontendUrl}/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&needsPassword=true`);
    }

    // Normal redirect
    res.redirect(`${frontendUrl}/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);

  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
  }
}

/**
 * Complete Google Login (Create user with password)
 */
async function completeGoogleLogin(req, res) {
  try {
    const { tempToken, password } = req.body;

    if (!tempToken || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Registration session expired or invalid'
      });
    }

    if (decoded.type !== 'google_registration') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid token type'
      });
    }

    // Check if user already exists (race condition check)
    const existingUser = await prisma.user.findUnique({
      where: { email: decoded.email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Registration failed',
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: decoded.email,
        name: decoded.name,
        googleId: decoded.googleId,
        avatar: decoded.avatar,
        password: hashedPassword,
        isVerified: true // Google verified
      }
    });

    // Generate real tokens
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Complete Google login error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
}

/**
 * Set password for Google users (Legacy/Existing users)
 */
async function setPassword(req, res) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      message: 'Password set successfully'
    });

  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({
      error: 'Failed to set password',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  login,
  register,
  refreshToken,
  getProfile,
  updateProfile,
  verify,
  googleCallback,
  completeGoogleLogin,
  setPassword
};
