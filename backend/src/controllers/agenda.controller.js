const prisma = require('../lib/prisma');

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

    const agenda = await prisma.agenda.update({
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
        }
      }
    });

    res.json({
      message: 'Agenda updated successfully',
      agenda
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
 * Add user to agenda
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

    // Add user to agenda
    const agendaUser = await prisma.agendaUser.create({
      data: {
        agendaId,
        userId: user.id,
        role: role || 'VIEWER'
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'AGENDA_INVITATION',
        title: 'Agenda Invitation',
        message: `You have been invited to join an agenda`,
      }
    });

    res.status(201).json({
      message: 'User added to agenda successfully',
      agendaUser
    });

  } catch (error) {
    console.error('Add user to agenda error:', error);
    res.status(500).json({ 
      error: 'Failed to add user to agenda',
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
    const { agendaId, userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Role is required' 
      });
    }

    const agendaUser = await prisma.agendaUser.update({
      where: {
        agendaId_userId: {
          agendaId,
          userId
        }
      },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    res.json({
      message: 'User role updated successfully',
      agendaUser
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      error: 'Failed to update user role',
      message: 'Internal server error' 
    });
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
  updateUserRole
};
