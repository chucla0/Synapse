const prisma = require('../../lib/prisma');
const NotificationService = require('../notification/notification.service.js');
const GoogleSyncService = require('../google-sync/google-sync.service.js');

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

    const isSummary = req.query.summary === 'true';

    const events = await prisma.event.findMany({
      where,
      select: isSummary ? {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        isAllDay: true,
        color: true,
        status: true,
        isPrivate: true,
        isRecurring: true,
        recurrenceRule: true,
        creatorId: true,
        agendaId: true,
        visibleToStudents: true,
        // Relations needed for permission checks
        agenda: {
          select: { id: true, name: true, color: true, type: true, ownerId: true }
        },
        creator: {
          select: { id: true }
        },
        sharedWithUsers: {
          select: { id: true }
        },
        // Minimal counts
        _count: {
          select: { attachments: true, links: true }
        }
      } : {
        // Full selection (default)
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        isAllDay: true,
        status: true,
        isRecurring: true,
        recurrenceRule: true,
        color: true,
        isPrivate: true,
        timezone: true,
        visibleToStudents: true,
        creatorId: true,
        agendaId: true,
        createdAt: true,
        updatedAt: true,
        agenda: {
          select: { id: true, name: true, color: true, type: true, ownerId: true },
        },
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        sharedWithUsers: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        _count: {
          select: { attachments: true, links: true }
        },
        attachments: true,
        links: true
      },
      orderBy: { startTime: 'asc' }
    });

    // Filter events based on visibility rules
    const visibleEvents = await Promise.all(events.map(async (event) => {
      // 1. If not private, everyone with access to agenda can see it
      if (!event.isPrivate) return event;

      // 2. If user is the creator, they can always see it
      if (event.creatorId === userId) return event;

      // 3. Check agenda type specific rules
      const agenda = event.agenda;

      // Get user role in this agenda
      let userRole = null;
      if (agenda.ownerId === userId) {
        userRole = 'OWNER';
      } else {
        const agendaUser = await prisma.agendaUser.findUnique({
          where: { agendaId_userId: { agendaId: agenda.id, userId } }
        });
        userRole = agendaUser?.role;
      }



      // If user has no role (shouldn't happen due to initial query, but safe check)
      if (!userRole) return null;

      // Rule: Owner always sees everything (in all types?)
      // Prompt says: "en la de trabajo todos los jeves y owner pueden ver eventos privados"
      // "en la de eduativa solo pueden ver los eventos privados los profesores" (implies owner too usually)
      if (userRole === 'OWNER') return event;

      if (agenda.type === 'PERSONAL') {
        // Should be owner only, covered above
        return event;
      }

      if (agenda.type === 'COLABORATIVA') {
        // "en la colaborativa tal cual asi" -> implies standard behavior, maybe all members see private?
        // Or maybe standard private behavior (only creator)?
        // Re-reading: "en la colaborativa tal cual asi" likely means "as it is now" or "same as personal/default".
        // Usually private means private to creator. 
        // BUT, if it's "collaborative", maybe they share everything?
        // Let's assume "tal cual asi" means "keep existing logic" which was: if you have access to agenda, you see it?
        // Wait, previous logic didn't filter private events at all in `getAllEvents`! 
        // It only filtered by agenda access. So previously EVERYONE saw private events.
        // So for Collaborative, we keep it visible to everyone.
        return event;
      }

      if (agenda.type === 'LABORAL') {
        // Chief sees all
        if (userRole === 'CHIEF') return event;

        // Employee: only if added (sharedWith) or created (covered above)
        if (userRole === 'EMPLOYEE') {
          const isShared = event.sharedWithUsers.some(u => u.id === userId);
          if (isShared) return event;
          return null; // Hidden
        }
      }

      if (agenda.type === 'EDUCATIVA') {
        // Professor sees all
        if (userRole === 'PROFESSOR' || userRole === 'TEACHER') return event; // 'TEACHER' is the enum value usually? Check schema/other files. 
        // In other files I saw 'TEACHER' used in removeUserFromAgenda logic: `requesterRole === 'TEACHER'`.
        // Let's assume 'TEACHER' is the role name for professor.

        // Student: only if visibleToStudents is true
        if (userRole === 'STUDENT') {
          if (event.visibleToStudents) return event;
          // Also check if explicitly shared? Prompt says "al elegir las personas... son obviamente solo las que esten en esa agenda"
          // It implies manual sharing is possible too.
          const isShared = event.sharedWithUsers.some(u => u.id === userId);
          if (isShared) return event;
          return null;
        }
      }

      // Default fallback (e.g. VIEWER in other types): if shared, see it
      const isShared = event.sharedWithUsers.some(u => u.id === userId);
      if (isShared) return event;

      return null;
    }));

    const finalEvents = visibleEvents.filter(e => e !== null);

    console.log(`API returning ${finalEvents.length} events for user ${userId}`);

    res.json({
      events: finalEvents
    });

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
        sharedWithUsers: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        exceptions: true,
        attachments: true,
        links: true
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
      timezone,
      attachments, // Array of { url, filename, mimeType, size }
      links        // Array of { url, title, description, imageUrl }
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
        timezone: timezone || 'UTC',
        attachments: {
          create: attachments || []
        },
        links: {
          create: links || []
        },
        visibleToStudents: req.body.visibleToStudents || false,
        sharedWithUsers: {
          connect: req.body.sharedWithUserIds?.map(id => ({ id })) || []
        }
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

    // Create notification for agenda members
    if (agenda.type !== 'PERSONAL') {
      if (eventStatus === 'PENDING_APPROVAL') {
        // Notify Owner and Chiefs only
        const recipients = await prisma.agendaUser.findMany({
          where: {
            agendaId,
            role: { in: ['CHIEF'] }
          },
          select: { userId: true }
        });

        // Always include owner
        const recipientIds = [agenda.ownerId, ...recipients.map(r => r.userId)];
        // Filter out sender (if sender is somehow owner/chief creating pending event, unlikely but safe)
        const finalRecipientIds = [...new Set(recipientIds)].filter(id => id !== userId);

        if (finalRecipientIds.length > 0) {
          await prisma.notification.createMany({
            data: finalRecipientIds.map(recipientId => ({
              recipientId,
              senderId: userId,
              type: 'EVENT_PENDING_APPROVAL',
              agendaId,
              eventId: event.id,
              data: { eventTitle: event.title }
            }))
          });
        }

      } else {
        // Standard notification for confirmed events
        await NotificationService.createNotificationsForAgendaMembers({
          agendaId,
          senderId: userId,
          type: 'EVENT_CREATED',
          eventId: event.id,
        });
      }

      // Emit socket event to all agenda members (trigger refetch)
      if (req.io) {
        const allMembers = await prisma.agendaUser.findMany({
          where: { agendaId },
          select: { userId: true }
        });
        const allRecipientIds = [...new Set([...allMembers.map(m => m.userId), agenda.ownerId])];

        allRecipientIds.forEach(uid => {
          req.io.to(`user:${uid}`).emit('event:created', {
            eventId: event.id,
            agendaId: agendaId,
            action: 'created'
          });
        });
      }
    }



    // Google Calendar Sync (Outgoing)
    if (agenda.googleCalendarId) {
      // We don't await this to avoid slowing down the response? 
      // Or we should await to ensure consistency? 
      // Let's await but catch errors so we don't fail the request if Google is down.
      try {
        await GoogleSyncService.createGoogleEvent(userId, event);
      } catch (googleError) {
        console.error('Failed to sync new event to Google Calendar:', googleError);
        // We could add a flag "syncFailed" to the event if we wanted to retry later
      }
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

    // Check permission
    const isCreator = event.creatorId === userId;
    const isAgendaOwner = event.agenda.ownerId === userId;

    console.log(`[UpdateEvent] User: ${userId}, Event: ${eventId}`);
    console.log(`[UpdateEvent] AgendaOwner: ${event.agenda.ownerId}, IsOwner: ${isAgendaOwner}`);
    console.log(`[UpdateEvent] Creator: ${event.creatorId}, IsCreator: ${isCreator}`);

    if (isAgendaOwner) {
      // Owner can always update
      console.log('[UpdateEvent] Allowed: User is agenda owner');
    } else {
      // Check role-based permissions
      const agendaUser = await prisma.agendaUser.findUnique({
        where: { agendaId_userId: { agendaId: event.agendaId, userId } }
      });
      const userRole = agendaUser?.role;
      console.log(`[UpdateEvent] UserRole: ${userRole}, AgendaType: ${event.agenda.type}`);

      if (!userRole) {
        console.log('[UpdateEvent] Denied: No role in agenda');
        return res.status(403).json({ error: 'Permission denied', message: 'You are not a member of this agenda', debug: 'No role found' });
      }

      const agendaType = event.agenda.type;

      if (agendaType === 'PERSONAL') {
        // Should be owner only (handled above), but if shared? Personal usually not shared.
        if (!isCreator) {
          console.log('[UpdateEvent] Denied: Personal agenda, not creator');
          return res.status(403).json({ error: 'Permission denied', message: 'Only the creator can update events in this personal agenda', debug: 'Personal agenda, not creator' });
        }
      } else if (agendaType === 'COLABORATIVA') {
        // Editors can only update their own events
        if (userRole === 'EDITOR' && !isCreator) {
          console.log('[UpdateEvent] Denied: Collaborative editor, not creator');
          return res.status(403).json({ error: 'Permission denied', message: 'Editors can only update their own events', debug: 'Collaborative editor, not creator' });
        }
        if (userRole === 'VIEWER') {
          console.log('[UpdateEvent] Denied: Collaborative viewer');
          return res.status(403).json({ error: 'Permission denied', message: 'Viewers cannot update events', debug: 'Collaborative viewer' });
        }
      } else if (agendaType === 'LABORAL') {
        // Chiefs can update all? Prompt says "jefes pueden crear eventos y aceptar o rechazar... pero no pueden manejar los roles".
        // Usually chiefs manage events. Let's assume Chiefs can update all events in the agenda.
        if (userRole === 'CHIEF') {
          // Allowed
        } else if (userRole === 'EMPLOYEE') {
          // Employees can only update their own PENDING events
          if (!isCreator) {
            console.log('[UpdateEvent] Denied: Employee, not creator');
            return res.status(403).json({ error: 'Permission denied', message: 'Employees can only update their own events', debug: 'Employee, not creator' });
          }
          if (event.status !== 'PENDING_APPROVAL') {
            console.log('[UpdateEvent] Denied: Employee, event not pending');
            return res.status(403).json({ error: 'Permission denied', message: 'Cannot update approved events', debug: 'Employee, event not pending' });
          }
        } else {
          console.log('[UpdateEvent] Denied: Laboral unknown role');
          return res.status(403).json({ error: 'Permission denied', debug: `Laboral unknown role: ${userRole}` });
        }
      } else if (agendaType === 'EDUCATIVA') {
        // Professors can update ANY event (from other professors too)
        if (userRole === 'PROFESSOR' || userRole === 'TEACHER') {
          // Allowed
        } else {
          console.log('[UpdateEvent] Denied: Educativa role not professor/teacher');
          return res.status(403).json({ error: 'Permission denied', message: 'Only professors can update events', debug: `Educativa role: ${userRole}` });
        }
      }
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
        ...(updateData.visibleToStudents !== undefined && { visibleToStudents: updateData.visibleToStudents }),
        ...(updateData.sharedWithUserIds && {
          sharedWithUsers: {
            set: updateData.sharedWithUserIds.map(id => ({ id }))
          }
        }),
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

    // Handle attachments and links updates if provided
    if (updateData.attachments) {
      // Delete existing and recreate (simple approach)
      // In a real app, we might want to be smarter to avoid re-uploading or losing data
      // But since attachments are just references to files, this updates the references.
      // Ideally frontend sends "newAttachments" and we keep old ones, or sends full list.
      // Let's assume frontend sends the FULL list of desired attachments.

      // Actually, for simplicity and safety, let's just ADD new ones if provided separate from existing?
      // No, let's go with: if attachments is provided, we replace the list (delete all for this event, create new).
      // WARN: This deletes DB records. Files remain in storage.
      await prisma.attachment.deleteMany({ where: { eventId } });
      if (updateData.attachments.length > 0) {
        await prisma.attachment.createMany({
          data: updateData.attachments.map(a => ({ ...a, eventId }))
        });
      }
    }

    if (updateData.links) {
      await prisma.link.deleteMany({ where: { eventId } });
      if (updateData.links.length > 0) {
        await prisma.link.createMany({
          data: updateData.links.map(l => ({ ...l, eventId }))
        });
      }
    }

    // Refetch to get everything
    const finalEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        agenda: { select: { id: true, name: true, color: true, type: true } },
        creator: { select: { id: true, name: true, email: true, avatar: true } },
        attachments: true,
        links: true
      }
    });

    // Create notification for agenda members
    if (event.agenda.type !== 'PERSONAL') {
      await NotificationService.createNotificationsForAgendaMembers({
        agendaId: event.agendaId,
        senderId: userId,
        type: 'EVENT_UPDATED',
        eventId: event.id,
      });

      // Emit socket event
      if (req.io) {
        const allMembers = await prisma.agendaUser.findMany({
          where: { agendaId: event.agendaId },
          select: { userId: true }
        });
        const allRecipientIds = [...new Set([...allMembers.map(m => m.userId), event.agenda.ownerId])];

        allRecipientIds.forEach(uid => {
          req.io.to(`user:${uid}`).emit('event:updated', {
            eventId: event.id,
            agendaId: event.agendaId,
            action: 'updated'
          });
        });
      }
    }



    // Google Calendar Sync (Outgoing)
    if (event.agenda.googleCalendarId && updatedEvent.googleEventId) {
      try {
        await GoogleSyncService.updateGoogleEvent(userId, updatedEvent);
      } catch (googleError) {
        console.error('Failed to sync updated event to Google Calendar:', googleError);
      }
    }

    res.json({
      message: 'Event updated successfully',
      event: finalEvent
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
    const userId = req.user.id; // Re-added userId declaration
    // Get event with agenda
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        agenda: {
          include: {
            agendaUsers: true,
            owner: true,
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }

    // Check permission
    const isCreator = event.creatorId === userId;
    const isAgendaOwner = event.agenda.ownerId === userId;

    if (isAgendaOwner) {
      // Owner can always delete
    } else {
      const agendaUser = await prisma.agendaUser.findUnique({
        where: { agendaId_userId: { agendaId: event.agenda.id, userId } }
      });
      const userRole = agendaUser?.role;

      if (!userRole) {
        return res.status(403).json({ error: 'Permission denied', message: 'You are not a member of this agenda' });
      }

      const agendaType = event.agenda.type;

      if (agendaType === 'COLABORATIVA') {
        // Editors can only delete their own events
        if (userRole === 'EDITOR' && !isCreator) {
          return res.status(403).json({ error: 'Permission denied', message: 'Editors can only delete their own events' });
        }
        if (userRole === 'VIEWER') {
          return res.status(403).json({ error: 'Permission denied' });
        }
      } else if (agendaType === 'LABORAL') {
        // Chiefs can delete all?
        if (userRole === 'CHIEF') {
          // Allowed
        } else if (userRole === 'EMPLOYEE') {
          // Employees can only delete their own PENDING events
          if (!isCreator) {
            return res.status(403).json({ error: 'Permission denied', message: 'Employees can only delete their own events' });
          }
          if (event.status !== 'PENDING_APPROVAL') {
            return res.status(403).json({ error: 'Permission denied', message: 'Cannot delete approved events' });
          }
        } else {
          return res.status(403).json({ error: 'Permission denied' });
        }
      } else if (agendaType === 'EDUCATIVA') {
        // Professors can delete ANY event
        if (userRole === 'PROFESSOR' || userRole === 'TEACHER') {
          // Allowed
        } else {
          return res.status(403).json({ error: 'Permission denied' });
        }
      }
    }

    await prisma.event.delete({
      where: { id: eventId }
    });

    // Send notification to all agenda members (excluding the deleter)
    if (event.agenda.type !== 'PERSONAL') {
      await NotificationService.createNotificationsForAgendaMembers({
        agendaId: event.agenda.id,
        senderId: userId,
        type: 'EVENT_DELETED',
        eventId: null, // Set eventId to null as the event no longer exists
        excludeSender: true,
        data: { eventTitle: event.title, agendaName: event.agenda.name },
      });

      // Emit socket event
      if (req.io) {
        const allMembers = await prisma.agendaUser.findMany({
          where: { agendaId: event.agenda.id },
          select: { userId: true }
        });
        const allRecipientIds = [...new Set([...allMembers.map(m => m.userId), event.agenda.ownerId])];

        allRecipientIds.forEach(uid => {
          req.io.to(`user:${uid}`).emit('event:deleted', {
            eventId: eventId,
            agendaId: event.agenda.id,
            action: 'deleted'
          });
        });
      }
    }



    // Google Calendar Sync (Outgoing)
    if (event.agenda.googleCalendarId && event.googleEventId) {
      try {
        await GoogleSyncService.deleteGoogleEvent(userId, event.googleEventId);
      } catch (googleError) {
        console.error('Failed to sync deleted event to Google Calendar:', googleError);
      }
    }

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
    console.log(`[DEBUG] approveEvent called for ${eventId}`);
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
    await NotificationService.createNotification({
      recipientId: event.creatorId,
      senderId: userId,
      type: 'EVENT_APPROVED',
      eventId: event.id,
      agendaId: event.agendaId,
      data: {
        message: `Your event "${event.title}" has been approved`
      }
    });

    // Emit socket event
    if (req.io) {
      const allMembers = await prisma.agendaUser.findMany({
        where: { agendaId: event.agendaId },
        select: { userId: true }
      });
      const allRecipientIds = [...new Set([...allMembers.map(m => m.userId), event.agenda.ownerId])];

      allRecipientIds.forEach(uid => {
        req.io.to(`user:${uid}`).emit('event:updated', {
          eventId: event.id,
          agendaId: event.agendaId,
          action: 'updated',
          status: 'CONFIRMED'
        });
      });
    }

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
    console.log(`[DEBUG] rejectEvent called for ${eventId}`);
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
    await NotificationService.createNotification({
      recipientId: event.creatorId,
      senderId: userId,
      type: 'EVENT_REJECTED',
      eventId: event.id,
      agendaId: event.agendaId,
      data: {
        message: `Your event "${event.title}" has been rejected`,
        reason: reason
      }
    });

    // Emit socket event
    if (req.io) {
      const allMembers = await prisma.agendaUser.findMany({
        where: { agendaId: event.agendaId },
        select: { userId: true }
      });
      const allRecipientIds = [...new Set([...allMembers.map(m => m.userId), event.agenda.ownerId])];

      allRecipientIds.forEach(uid => {
        req.io.to(`user:${uid}`).emit('event:updated', {
          eventId: event.id,
          agendaId: event.agendaId,
          action: 'updated',
          status: 'REJECTED'
        });
      });
    }

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
