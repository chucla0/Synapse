const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const authService = require('../services/auth.service');
const fs = require('fs');
const path = require('path');

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
    const user = await authService.createUser(prisma, {
      email,
      password: hashedPassword,
      name,
    });

    // Generate tokens
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    res.status(201).json({
      message: 'Registration successful',
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
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

module.exports = {
  login,
  register,
  refreshToken,
  getProfile,
  updateProfile
};
