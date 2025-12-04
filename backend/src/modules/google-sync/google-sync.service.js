const { google } = require('googleapis');
const prisma = require('../../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
/**
 * Get authenticated Google Calendar client for a user
 */
async function getAuthenticatedClient(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true }
  });

  if (!user || !user.googleRefreshToken) {
    throw new Error('User not connected to Google Calendar');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken
  });

  // Listen for token updates (refresh)
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined // refresh_token might not be returned
        }
      });
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Google Calendar Color Palette (ID -> Hex)
const GOOGLE_COLORS = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#f6bf26', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
};

// Reverse mapping (Hex -> ID) for export
const GOOGLE_COLORS_REVERSE = Object.entries(GOOGLE_COLORS).reduce((acc, [id, hex]) => {
  acc[hex.toLowerCase()] = id;
  return acc;
}, {});

/**
 * Import events from Google Calendar (Backfill)
 * Creates a "Google Calendar" agenda if it doesn't exist
 */
async function importGoogleCalendar(userId) {
  const calendar = await getAuthenticatedClient(userId);

  // 1. Find or Create "Google Calendar" Agenda
  // Fetch primary calendar details to get the color
  const calendarListEntry = await calendar.calendarList.get({ calendarId: 'primary' });
  const googleCalendarColor = calendarListEntry.data.backgroundColor || '#34A853';

  // Check for existing agenda with googleCalendarId='primary' OR name='Google Calendar' for this user
  const existingAgendas = await prisma.agenda.findMany({
    where: {
      ownerId: userId,
      OR: [
        { googleCalendarId: 'primary' },
        { name: 'Google Calendar' }
      ]
    },
    orderBy: { createdAt: 'asc' } // Keep the oldest one
  });

  let agenda;

  if (existingAgendas.length === 0) {
    agenda = await prisma.agenda.create({
      data: {
        name: 'Google Calendar',
        description: 'Imported from Google Calendar',
        type: 'PERSONAL',
        color: googleCalendarColor,
        ownerId: userId,
        googleCalendarId: 'primary'
      }
    });

    // Add owner as member
    await prisma.agendaUser.create({
      data: {
        agendaId: agenda.id,
        userId: userId,
        role: 'OWNER'
      }
    });
  } else {
    // Use the first one found
    agenda = existingAgendas[0];

    // If there are duplicates, delete them
    if (existingAgendas.length > 1) {
      const idsToDelete = existingAgendas.slice(1).map(a => a.id);
      await prisma.agenda.deleteMany({
        where: { id: { in: idsToDelete } }
      });
      console.log(`Deleted ${idsToDelete.length} duplicate Google Agendas for user ${userId}`);
    }

    // Ensure googleCalendarId is set and color is updated
    agenda = await prisma.agenda.update({
      where: { id: agenda.id },
      data: {
        googleCalendarId: 'primary',
        color: googleCalendarColor // Update to actual Google color
      }
    });
  }

  // 2. Fetch Events (Last 30 days to next year)
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const events = [];
  let pageToken = null;

  do {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oneMonthAgo.toISOString(),
      maxResults: 2500, // Increase page size to minimize requests
      singleEvents: true,
      orderBy: 'startTime',
      pageToken: pageToken
    });

    if (response.data.items) {
      events.push(...response.data.items);
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  let importedCount = 0;

  // 3. Create Events in Synapse
  for (const googleEvent of events) {
    // Skip if already imported
    // Check if event already exists
    const existingEvent = await prisma.event.findUnique({
      where: { googleEventId: googleEvent.id }
    });

    // Map Google Event to Synapse Event Data
    const startTime = googleEvent.start.dateTime || googleEvent.start.date;
    const endTime = googleEvent.end.dateTime || googleEvent.end.date;
    const isAllDay = !googleEvent.start.dateTime;

    const eventData = {
      title: googleEvent.summary || '(No Title)',
      description: googleEvent.description,
      location: googleEvent.location,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isAllDay: isAllDay,
      agendaId: agenda.id,
      creatorId: userId,
      status: 'CONFIRMED',
      color: googleEvent.colorId ? GOOGLE_COLORS[googleEvent.colorId] : undefined
    };

    if (existingEvent) {
      // Update existing event
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          isAllDay: eventData.isAllDay,
          color: eventData.color
        }
      });
    } else {
      // Create new event
      await prisma.event.create({
        data: {
          ...eventData,
          googleEventId: googleEvent.id
        }
      });
      importedCount++;
    }
    importedCount++;
  }

  return { importedCount, agendaId: agenda.id };
}

/**
 * Create an event in Google Calendar
 */
async function createGoogleEvent(userId, event) {
  try {
    const calendar = await getAuthenticatedClient(userId);

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: event.startTime.toISOString().split('T')[0] }
        : { dateTime: event.startTime.toISOString() },
      end: event.isAllDay
        ? { date: event.endTime.toISOString().split('T')[0] }
        : { dateTime: event.endTime.toISOString() },
      colorId: event.color ? GOOGLE_COLORS_REVERSE[event.color.toLowerCase()] : undefined
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: googleEvent,
    });

    // Update local event with Google ID
    await prisma.event.update({
      where: { id: event.id },
      data: { googleEventId: response.data.id }
    });

    return response.data;
  } catch (error) {
    console.error('Error creating Google event:', error);
    throw error;
  }
}

/**
 * Update an event in Google Calendar
 */
async function updateGoogleEvent(userId, event) {
  if (!event.googleEventId) return;

  try {
    const calendar = await getAuthenticatedClient(userId);

    const googleEvent = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: event.isAllDay
        ? { date: new Date(event.startTime).toISOString().split('T')[0] }
        : { dateTime: new Date(event.startTime).toISOString() },
      end: event.isAllDay
        ? { date: new Date(event.endTime).toISOString().split('T')[0] }
        : { dateTime: new Date(event.endTime).toISOString() },
      colorId: event.color ? GOOGLE_COLORS_REVERSE[event.color.toLowerCase()] : undefined
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: event.googleEventId,
      resource: googleEvent,
    });
  } catch (error) {
    console.error('Error updating Google event:', error);
    // Don't throw, just log. We don't want to break local updates if Google fails.
  }
}

/**
 * Delete an event from Google Calendar
 */
async function deleteGoogleEvent(userId, googleEventId) {
  if (!googleEventId) return;

  try {
    const calendar = await getAuthenticatedClient(userId);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });
  } catch (error) {
    console.error('Error deleting Google event:', error);
  }
}

/**
 * Watch Google Calendar for changes (Webhook)
 */
async function watchCalendar(userId) {
  const calendar = await getAuthenticatedClient(userId);

  // Get the agenda to check if we already have a channel
  const agenda = await prisma.agenda.findFirst({
    where: {
      ownerId: userId,
      googleCalendarId: 'primary'
    }
  });

  if (!agenda) {
    throw new Error('Google Calendar agenda not found');
  }

  // If we already have a valid channel, maybe we don't need to do anything?
  // But channels expire, so we might need to renew.
  // For now, let's stop the old one and create a new one to be safe.
  if (agenda.googleChannelId && agenda.googleResourceId) {
    try {
      await stopWatchingCalendar(userId);
    } catch (e) {
      console.warn('Failed to stop previous channel', e);
    }
  }

  const channelId = uuidv4();

  // Determine the public URL for the webhook
  let publicUrl = process.env.FRONTEND_URL;
  if (publicUrl && publicUrl.includes(',')) {
    // If multiple URLs, prefer the one that is NOT localhost, or just the first one
    const urls = publicUrl.split(',').map(u => u.trim());
    publicUrl = urls.find(u => !u.includes('localhost')) || urls[0];
  }
  // Remove trailing slash if present
  publicUrl = publicUrl ? publicUrl.replace(/\/$/, '') : '';

  const webhookUrl = `${publicUrl}/api/integrations/google/webhook`;
  console.log(`Registering Google Webhook URL: ${webhookUrl}`);

  const response = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      // params: { ttl: '3600' } // Optional: set TTL
    }
  });

  const { id, resourceId, expiration } = response.data;

  // Update agenda with channel info
  await prisma.agenda.update({
    where: { id: agenda.id },
    data: {
      googleChannelId: id,
      googleResourceId: resourceId,
      googleChannelExpiration: expiration ? new Date(parseInt(expiration)) : undefined
    }
  });

  return response.data;
}

/**
 * Stop watching Google Calendar
 */
async function stopWatchingCalendar(userId) {
  const calendar = await getAuthenticatedClient(userId);

  const agenda = await prisma.agenda.findFirst({
    where: {
      ownerId: userId,
      googleCalendarId: 'primary'
    }
  });

  if (!agenda || !agenda.googleChannelId || !agenda.googleResourceId) {
    return;
  }

  try {
    await calendar.channels.stop({
      requestBody: {
        id: agenda.googleChannelId,
        resourceId: agenda.googleResourceId
      }
    });
  } catch (error) {
    console.error('Error stopping Google channel:', error);
    // Continue to clear DB even if Google fails (maybe channel expired)
  }

  await prisma.agenda.update({
    where: { id: agenda.id },
    data: {
      googleChannelId: null,
      googleResourceId: null,
      googleChannelExpiration: null
    }
  });
}

/**
 * Sync by Channel ID (Webhook)
 */
async function syncByChannelId(channelId, io) {
  const agenda = await prisma.agenda.findFirst({
    where: { googleChannelId: channelId }
  });

  if (!agenda) {
    console.warn(`No agenda found for channel ${channelId}`);
    return;
  }

  console.log(`Syncing Google Calendar for user ${agenda.ownerId} via webhook`);
  const result = await importGoogleCalendar(agenda.ownerId);

  // Emit socket event
  if (io) {
    io.to(`user:${agenda.ownerId}`).emit('agenda:updated', {
      agendaId: result.agendaId,
      action: 'imported'
    });
  }
}

module.exports = {
  importGoogleCalendar,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  watchCalendar,
  stopWatchingCalendar,
  syncByChannelId
};
