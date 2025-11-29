const { google } = require('googleapis');
const prisma = require('../../lib/prisma');

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

/**
 * Import events from Google Calendar (Backfill)
 * Creates a "Google Calendar" agenda if it doesn't exist
 */
async function importGoogleCalendar(userId) {
  const calendar = await getAuthenticatedClient(userId);

  // 1. Find or Create "Google Calendar" Agenda
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
        color: '#34A853', // Google Green
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
        color: '#34A853' // Force update to Green
      }
    });
  }

  // 2. Fetch Events (Last 30 days to next year)
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: oneMonthAgo.toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = response.data.items;
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
      status: 'CONFIRMED'
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
          isAllDay: eventData.isAllDay
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

module.exports = {
  importGoogleCalendar,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent
};
