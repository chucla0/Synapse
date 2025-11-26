const prisma = require('../lib/prisma');

/**
 * Get all events with filters
 */
async function getAllEvents(req, res) {
  try {
    const userId = req.user.id;
    const { agendaId, startDate, endDate, status } = req.query;

    // Build where clause
    const where = {
      AND: [
        // User must have access to the agenda
        {
          OR: [
            { agenda: { ownerId: userId } },
            { agenda: { agendaUsers: { some: { userId } } } }
          ]
        }
      ]
    };

    // Apply filters
    if (agendaId) {
      where.AND.push({ agendaId });
    }

    if (startDate && endDate) {
      where.AND.push({
        OR: [
          // Event starts within range
          { startTime: { gte: new Date(startDate), lte: new Date(endDate) } },
          // Event ends within range
          { endTime: { gte: new Date(startDate), lte: new Date(endDate) } },
          // Event spans the range
          { 
            AND: [
              { startTime: { lte: new Date(startDate) } },
              { endTime: { gte: new Date(endDate) } }
            ]
          }
        ]
      });
    }

    if (status) {
      where.AND.push({ status });
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        agenda: {
          select: { id: true, name: true, color: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    res.json({ events });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch events',
      message: 'Internal server error' 
    });
  }
}

/**
 * Get event by ID
 */
async function getEventById(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        agenda: {
          select: { id: true, name: true, color: true, type: true, ownerId: true }
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        exceptions: true
      }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Check access permission
    const hasAccess = event.agenda.ownerId === userId || 
      await prisma.agendaUser.findUnique({
        where: {
          agendaId_userId: {
            agendaId: event.agendaId,
            userId
          }
        }
      });

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this event' 
      });
    }

    res.json({ event });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch event',
      message: 'Internal server error' 
    });
  }
}

/**
 * Create a new event with business logic
 */
async function createEvent(req, res) {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      location,
      agendaId,
      startTime,
      endTime,
      isAllDay,
      isRecurring,
      recurrenceRule,
      color,
      isPrivate,
      timezone
    } = req.body;

    // Validate required fields
    if (!title || !agendaId || !startTime || !endTime) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Title, agenda, start time, and end time are required' 
      });
    }

    // Get agenda with type
    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: {
        agendaUsers: {
          where: { userId }
        }
      }
    });

    if (!agenda) {
      return res.status(404).json({ 
        error: 'Agenda not found' 
      });
    }

    // Check if user has access
    const isOwner = agenda.ownerId === userId;
    const userRole = isOwner ? 'OWNER' : agenda.agendaUsers[0]?.role;

    if (!isOwner && !userRole) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this agenda' 
      });
    }

    // Determine event status based on agenda type and user role
    let eventStatus = 'CONFIRMED';

    if (agenda.type === 'LABORAL' && userRole === 'EMPLOYEE') {
      eventStatus = 'PENDING_APPROVAL';
    } else if (agenda.type === 'EDUCATIVA' && userRole === 'STUDENT') {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Students cannot create events in educational agendas' 
      });
    }

    // Check for time conflicts (only for confirmed events)
    const conflicts = await prisma.event.findMany({
      where: {
        agendaId,
        creatorId: userId,
        status: 'CONFIRMED',
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gte: new Date(startTime) } }
            ]
          },
          {
            AND: [
              { startTime: { lte: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } }
            ]
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } }
            ]
          }
        ]
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Time conflict',
        message: 'You have another event scheduled at this time',
        conflicts: conflicts.map(e => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime
        }))
      });
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        agendaId,
        creatorId: userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isAllDay: isAllDay || false,
        status: eventStatus,
        isRecurring: isRecurring || false,
        recurrenceRule,
        color,
        isPrivate: isPrivate || false,
        timezone: timezone || 'UTC'
      },
      include: {
        agenda: {
          select: { id: true, name: true, color: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Create notification if event needs approval
    if (eventStatus === 'PENDING_APPROVAL') {
      await prisma.notification.create({
        data: {
          userId: agenda.ownerId,
          type: 'EVENT_APPROVAL_REQUEST',
          title: 'Event Approval Request',
          message: `${req.user.name} created an event "${title}" that requires your approval`,
          eventId: event.id
        }
      });
    }

    res.status(201).json({
      message: 'Event created successfully',
      event
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      message: 'Internal server error' 
    });
  }
}

/**
 * Update event
 */
async function updateEvent(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Get event with agenda
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { agenda: true }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Check permission (only creator or agenda owner can update)
    if (event.creatorId !== userId && event.agenda.ownerId !== userId) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only the event creator or agenda owner can update this event' 
      });
    }

    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.location !== undefined && { location: updateData.location }),
        ...(updateData.startTime && { startTime: new Date(updateData.startTime) }),
        ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
        ...(updateData.isAllDay !== undefined && { isAllDay: updateData.isAllDay }),
        ...(updateData.color && { color: updateData.color }),
        ...(updateData.isPrivate !== undefined && { isPrivate: updateData.isPrivate }),
      },
      include: {
        agenda: {
          select: { id: true, name: true, color: true, type: true }
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ 
      error: 'Failed to update event',
      message: 'Internal server error' 
    });
  }
}

/**
 * Delete event
 */
async function deleteEvent(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Get event with agenda
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { agenda: true }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Check permission
    if (event.creatorId !== userId && event.agenda.ownerId !== userId) {
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Only the event creator or agenda owner can delete this event' 
      });
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    res.json({
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ 
      error: 'Failed to delete event',
      message: 'Internal server error' 
    });
  }
}

/**
 * Approve pending event (LABORAL agendas only)
 */
async function approveEvent(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { 
        agenda: true,
        creator: {
          select: { id: true, name: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Check if user is CHIEF or owner
    if (event.agenda.ownerId !== userId) {
      const agendaUser = await prisma.agendaUser.findUnique({
        where: {
          agendaId_userId: {
            agendaId: event.agendaId,
            userId
          }
        }
      });

      if (!agendaUser || agendaUser.role !== 'CHIEF') {
        return res.status(403).json({ 
          error: 'Permission denied',
          message: 'Only chiefs can approve events' 
        });
      }
    }

    // Update event status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'CONFIRMED',
        approvedBy: userId,
        approvedAt: new Date()
      },
      include: {
        agenda: {
          select: { id: true, name: true, color: true }
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: event.creatorId,
        type: 'EVENT_APPROVED',
        title: 'Event Approved',
        message: `Your event "${event.title}" has been approved`,
        eventId: event.id
      }
    });

    res.json({
      message: 'Event approved successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({ 
      error: 'Failed to approve event',
      message: 'Internal server error' 
    });
  }
}

/**
 * Reject pending event
 */
async function rejectEvent(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { 
        agenda: true,
        creator: {
          select: { id: true, name: true }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ 
        error: 'Event not found' 
      });
    }

    // Check permission
    if (event.agenda.ownerId !== userId) {
      const agendaUser = await prisma.agendaUser.findUnique({
        where: {
          agendaId_userId: {
            agendaId: event.agendaId,
            userId
          }
        }
      });

      if (!agendaUser || agendaUser.role !== 'CHIEF') {
        return res.status(403).json({ 
          error: 'Permission denied',
          message: 'Only chiefs can reject events' 
        });
      }
    }

    // Update event status
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'REJECTED'
      }
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: event.creatorId,
        type: 'EVENT_REJECTED',
        title: 'Event Rejected',
        message: `Your event "${event.title}" has been rejected${reason ? `: ${reason}` : ''}`,
        eventId: event.id
      }
    });

    res.json({
      message: 'Event rejected successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({ 
      error: 'Failed to reject event',
      message: 'Internal server error' 
    });
  }
}

module.exports = {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent
};
