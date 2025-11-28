const prisma = require('../../lib/prisma');
const NotificationService = require('../notification/notification.service.js');

/**
 * Get all agendas for current user
 */
async function getAllAgendas(req, res) {
  try {
    const userId = req.user.id;

    // Get owned agendas and agendas where user is a member
    const ownedAgendas = await prisma.agenda.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        agendaUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        _count: {
          select: { events: true }
        }
      }
    });

    const memberAgendas = await prisma.agendaUser.findMany({
      where: { userId },
      include: {
        agenda: {
          include: {
            owner: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            agendaUsers: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, avatar: true }
                }
              }
            },
            _count: {
              select: { events: true }
            }
          }
        }
      }
    });

    // Combine and format results
    const allAgendas = [
      ...ownedAgendas.map(agenda => ({ ...agenda, userRole: 'OWNER' })),
      ...memberAgendas.map(({ agenda, role }) => ({ ...agenda, userRole: role }))
    ];

    res.json({ agendas: allAgendas });

  } catch (error) {
    console.error('Get agendas error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agendas',
      message: 'Internal server error' 
    });
  }
}

/**
 * Create a new agenda
 */
async function createAgenda(req, res) {
  try {
    const { name, description, type, color, timezone } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Agenda name is required' 
      });
    }

    // Create agenda
    const agenda = await prisma.agenda.create({
      data: {
        name,
        description,
        type: type || 'PERSONAL',
        color: color || '#3B82F6',
        timezone: timezone || 'UTC',
        ownerId: userId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    res.status(201).json({
      message: 'Agenda created successfully',
      agenda: { ...agenda, userRole: 'OWNER' }
    });

  } catch (error) {
    console.error('Create agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to create agenda',
      message: 'Internal server error' 
    });
  }
}

/**
 * Get agenda by ID
 */
async function getAgendaById(req, res) {
  try {
    const { agendaId } = req.params;
    const userId = req.user.id;

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        agendaUsers: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        },
        _count: {
          select: { events: true }
        }
      }
    });

    if (!agenda) {
      return res.status(404).json({ 
        error: 'Agenda not found' 
      });
    }

    // Check access permission
    const isOwner = agenda.ownerId === userId;
    const isMember = agenda.agendaUsers.some(au => au.userId === userId);

    if (!isOwner && !isMember) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this agenda' 
      });
    }

    // Get user's role
    let userRole = 'OWNER';
    if (!isOwner) {
      const agendaUser = agenda.agendaUsers.find(au => au.userId === userId);
      userRole = agendaUser.role;
    }

    res.json({ 
      agenda: { ...agenda, userRole } 
    });

  } catch (error) {
    console.error('Get agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch agenda',
      message: 'Internal server error' 
    });
  }
}

/**
 * Update agenda
 */
async function updateAgenda(req, res) {
  try {
    const { agendaId } = req.params;
    const { name, description, color, timezone } = req.body;

    const updatedAgenda = await prisma.agenda.update({
      where: { id: agendaId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(timezone && { timezone }),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        agendaUsers: true, // Include agendaUsers to send notifications
      }
    });

    // Send notification to all agenda members (excluding the updater)
    if (updatedAgenda.type !== 'PERSONAL') {
      await NotificationService.createNotificationsForAgendaMembers({
        agendaId: updatedAgenda.id,
        senderId: req.user.id,
        type: 'AGENDA_UPDATED',
        excludeSender: true,
      });
    }

    res.json({
      message: 'Agenda updated successfully',
      agenda: updatedAgenda
    });

  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to update agenda',
      message: 'Internal server error' 
    });
  }
}

/**
 * Delete agenda
 */
async function deleteAgenda(req, res) {
  try {
    const { agendaId } = req.params;

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        agendaUsers: true, // Include agendaUsers to send notifications
        owner: true,
      },
    });

    if (!agenda) {
      return res.status(404).json({
        error: 'Agenda not found',
        message: 'Agenda to delete not found',
      });
    }

    // Send notification to all agenda members (excluding the deleter)
    if (agenda.type !== 'PERSONAL') {
      await NotificationService.createNotificationsForAgendaMembers({
        agendaId: agenda.id,
        senderId: req.user.id,
        type: 'AGENDA_DELETED',
        excludeSender: true,
        data: { agendaName: agenda.name },
      });
    }

    await prisma.agenda.delete({
      where: { id: agendaId }
    });

    res.json({
      message: 'Agenda deleted successfully'
    });

  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to delete agenda',
      message: 'Internal server error' 
    });
  }
}

/**
 * Add user to agenda (Send Invitation)
 */
async function addUserToAgenda(req, res) {
  try {
    const { agendaId } = req.params;
    const { email, role } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `No user found with email: ${email}` 
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.agendaUser.findUnique({
      where: {
        agendaId_userId: {
          agendaId,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'This user is already a member of the agenda' 
      });
    }

    // Check if invitation already exists
    const existingInvite = await prisma.notification.findFirst({
      where: {
        recipientId: user.id,
        agendaId: agendaId,
        type: 'AGENDA_INVITE'
      }
    });

    if (existingInvite) {
      return res.status(409).json({ 
        error: 'Invitation already sent',
        message: 'User has already been invited to this agenda' 
      });
    }

    // Create notification (Invitation)
    await NotificationService.createNotification({
      recipientId: user.id,
      senderId: req.user.id,
      type: 'AGENDA_INVITE',
      agendaId: agendaId,
      data: { role: role || 'VIEWER' },
    });

    res.status(201).json({
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Add user to agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to invite user',
      message: 'Internal server error' 
    });
  }
}

/**
 * Remove user from agenda
 */
async function removeUserFromAgenda(req, res) {
  try {
    const { agendaId, userId } = req.params;

    await prisma.agendaUser.delete({
      where: {
        agendaId_userId: {
          agendaId,
          userId
        }
      }
    });

    res.json({
      message: 'User removed from agenda successfully'
    });

  } catch (error) {
    console.error('Remove user from agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to remove user from agenda',
      message: 'Internal server error' 
    });
  }
}

/**
 * Update user role in agenda
 */
async function updateUserRole(req, res) {
  try {
    const { agendaId, userId: targetUserId } = req.params;
    const { role: newRole } = req.body;
    const requestingUserId = req.user.id;

    if (!newRole) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Role is required' 
      });
    }

    const agenda = await prisma.agenda.findUnique({ where: { id: agendaId } });
    if (!agenda) {
      return res.status(404).json({ error: 'Agenda not found' });
    }

    // A user cannot change their own role
    if (targetUserId === requestingUserId) {
      return res.status(403).json({ error: 'Permission denied', message: 'You cannot change your own role.' });
    }

    const requestingUserMembership = await prisma.agendaUser.findUnique({
      where: { agendaId_userId: { agendaId, userId: requestingUserId } }
    });

    const targetUserMembership = await prisma.agendaUser.findUnique({
      where: { agendaId_userId: { agendaId, userId: targetUserId } }
    });

    const isOwner = agenda.ownerId === requestingUserId;
    const requesterRole = isOwner ? 'OWNER' : requestingUserMembership?.role;

    if (!requesterRole) {
      return res.status(403).json({ error: 'Access denied', message: 'You are not a member of this agenda.' });
    }
    
    // --- PERMISSION LOGIC ---
    let canUpdate = false;

    if (isOwner) {
      // Owner can do almost anything
      canUpdate = true;
      if (agenda.type === 'EDUCATIVA') {
        return res.status(403).json({ error: 'Permission denied', message: 'Roles cannot be changed in educational agendas.' });
      }
    } else if (agenda.type === 'LABORAL' && requesterRole === 'CHIEF') {
      // A chief can only promote an employee to chief. They cannot manage other chiefs.
      if (targetUserMembership?.role === 'EMPLOYEE') {
        canUpdate = true;
      }
    }
    
    if (!canUpdate) {
      return res.status(403).json({ error: 'Permission denied', message: 'You do not have permission to change this user\'s role.' });
    }

    // Update the role
    const updatedAgendaUser = await prisma.agendaUser.update({
      where: {
        agendaId_userId: {
          agendaId,
          userId: targetUserId
        }
      },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Create notification for any role change in a LABORAL agenda
    if (agenda.type === 'LABORAL') {
      await NotificationService.createNotification({
        recipientId: targetUserId,
        senderId: requestingUserId,
        type: 'ROLE_CHANGED',
        agendaId: agendaId,
        data: { newRole: newRole },
      });
    }

    res.json({
      message: 'User role updated successfully',
      agendaUser: updatedAgendaUser
    });


  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: 'Internal server error' 
    });
  }
}

async function acceptInvitation(req, res) {
  try {
    const { notificationId } = req.body;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId || notification.type !== 'AGENDA_INVITE') {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Get role from notification data or default to VIEWER
    const role = notification.data?.role || 'VIEWER';

    await prisma.agendaUser.create({
      data: {
        agendaId: notification.agendaId,
        userId: userId,
        role: role,
      },
    });

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

async function declineInvitation(req, res) {
  try {
    const { notificationId } = req.body;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.recipientId !== userId || notification.type !== 'AGENDA_INVITE') {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
}

module.exports = {
  getAllAgendas,
  createAgenda,
  getAgendaById,
  updateAgenda,
  deleteAgenda,
  addUserToAgenda,
  removeUserFromAgenda,
  updateUserRole,
  acceptInvitation,
  declineInvitation,
};
