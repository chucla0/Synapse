const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Middleware to authenticate JWT tokens
 * Validates the token and attaches user info to req.user
 */
async function authenticateToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        googleId: true,
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'User not found' 
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is malformed or invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
}

/**
 * Middleware to check if user has specific role in an agenda
 */
function requireAgendaRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const { agendaId } = req.params;
      const userId = req.user.id;

      // Check if user is owner
      const agenda = await prisma.agenda.findUnique({
        where: { id: agendaId },
        select: { ownerId: true }
      });

      if (!agenda) {
        return res.status(404).json({ 
          error: 'Agenda not found' 
        });
      }

      // Owner has all permissions
      if (agenda.ownerId === userId) {
        req.userRole = 'OWNER';
        return next();
      }

      // Check user's role in agenda
      const agendaUser = await prisma.agendaUser.findUnique({
        where: {
          agendaId_userId: {
            agendaId,
            userId
          }
        },
        select: { role: true }
      });

      if (!agendaUser) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You are not a member of this agenda'
        });
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(agendaUser.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
        });
      }

      req.userRole = agendaUser.role;
      next();

    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ 
        error: 'Permission check failed',
        message: 'Internal server error'
      });
    }
  };
}

module.exports = {
  authenticateToken,
  requireAgendaRole
};
