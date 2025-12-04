const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const authService = require('./auth.service');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../../utils/mailer');
const { getVerificationEmailTemplate } = require('../../emails/verificationTemplate');

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
      user: {
        ...userWithoutPassword,
        hasPassword: !!user.password
      },
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
    // Generate verification token signed with specific email secret
    const verificationToken = jwt.sign(
      { email },
      process.env.JWT_SECRET_EMAIL,
      { expiresIn: '24h' }
    );

    const user = await authService.createUser(prisma, {
      email,
      password: hashedPassword,
      name,
      verificationToken,
      isVerified: false
    });

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'https://synapse.daw.inspedralbes.cat';
    const verificationLink = `${frontendUrl}/verify?token=${verificationToken}`;

    // Use API_URL for the logo since it's served from the backend
    const apiUrl = process.env.VITE_API_URL || 'https://synapse.daw.inspedralbes.cat';
    console.log('Debug Email Logo:', { apiUrl, logoUrl: `${apiUrl}/api/public/synapse_logo.jpg` });

    await sendEmail(
      email,
      'Verify your Synapse account',
      getVerificationEmailTemplate(verificationLink, name, apiUrl)
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
    // We need to check if the user has a password, so we might need to fetch it if it's not in req.user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });

    res.json({
      user: {
        ...req.user,
        hasPassword: !!user?.password
      }
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

    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_EMAIL);
    } catch (err) {
      return res.status(400).json({
        error: 'Verification failed',
        message: 'Invalid or expired token'
      });
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Verification failed',
        message: 'Token not found or already used'
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

    // Generate tokens
    const accessToken = authService.generateAccessToken(user.id);
    const refreshToken = authService.generateRefreshToken(user.id);

    // Check if user needs to set a password
    const needsPassword = !user.password;

    // If this was a "Connect Calendar" action, pass a flag to frontend to trigger import
    let actionParam = '';
    if (req.query.state === 'connect_calendar') {
      actionParam = '&action=import_google';

      // We still want to ensure the watch is set up, but maybe better to do it all in the import flow?
      // Actually, let's let the frontend trigger the full import flow which includes setting up the watch.
      // So we do NOTHING here except signal the frontend.
    }

    // Redirect to frontend with tokens
    res.redirect(`${frontendUrl}/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}&needsPassword=${needsPassword}${actionParam}`);

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
        avatar: user.avatar,
        hasPassword: !!user.password
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
  setPassword,
  getUserById,
  deleteAccount
};

/**
 * Get user by ID (public profile)
 */
async function getUserById(req, res) {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'Internal server error'
    });
  }
}

/**
 * Delete account
 * Transfers ownership of shared agendas and deletes user
 */
async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Verify password first
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If user has a password (not just Google), verify it
    if (user.password) {
      if (!password) {
        return res.status(400).json({ error: 'Password required', message: 'Please enter your password to confirm deletion' });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password', message: 'Incorrect password' });
      }
    }

    // Get all agendas owned by user
    const ownedAgendas = await prisma.agenda.findMany({
      where: { ownerId: userId },
      include: { agendaUsers: true }
    });

    // Process each agenda
    for (const agenda of ownedAgendas) {
      if (agenda.type === 'PERSONAL' || agenda.type === 'FAMILIAR') {
        // Delete personal/familiar agendas
        await prisma.agenda.delete({ where: { id: agenda.id } });
      } else {
        // Shared agendas: Try to transfer ownership
        let newOwnerId = null;
        let candidate = null;

        if (agenda.type === 'LABORAL') {
          // Transfer to CHIEF
          candidate = agenda.agendaUsers.find(u => u.role === 'CHIEF');
        } else if (agenda.type === 'EDUCATIVA') {
          // Transfer to PROFESSOR
          candidate = agenda.agendaUsers.find(u => u.role === 'PROFESSOR');
        } else if (agenda.type === 'COLABORATIVA') {
          // Transfer to EDITOR
          candidate = agenda.agendaUsers.find(u => u.role === 'EDITOR');
        }

        if (candidate) {
          newOwnerId = candidate.userId;

          // 1. Update Agenda Owner
          await prisma.agenda.update({
            where: { id: agenda.id },
            data: { ownerId: newOwnerId }
          });

          // 2. Remove new owner from AgendaUser (since they are now owner)
          await prisma.agendaUser.delete({
            where: { id: candidate.id }
          });

        } else {
          // No suitable successor found. 
          // Option A: Delete agenda (Safe fallback)
          // Option B: Leave it (Will be deleted by cascade when user is deleted)
          // Given the prompt "se le pasara solo a un jefe...", it implies if there is one. 
          // If not, it's ambiguous. But usually "Personal folders" are deleted. 
          // If a shared agenda has no other high-ranking members, maybe it should die with the owner?
          // Or maybe transfer to ANY member? 
          // Let's stick to: If no successor, it gets deleted (via Cascade when user is deleted).
          // We don't need to do anything explicit here, Prisma Cascade will handle it.
        }
      }
    }

    // Google Calendar: The prompt says "se eliminan todas tus agendas igual que la de google calendar".
    // This is covered by deleting 'PERSONAL' agendas (if the google calendar agenda is type PERSONAL).
    // If we have a specific "Google Calendar" agenda that is not PERSONAL (e.g. created as such), 
    // we should check. Usually they are PERSONAL.

    // Finally, delete the user
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account', message: 'Internal server error' });
  }
}
