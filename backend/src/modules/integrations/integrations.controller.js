const GoogleSyncService = require('../google-sync/google-sync.service');
const prisma = require('../../lib/prisma');

/**
 * Import Google Calendar events
 */
async function importGoogleCalendar(req, res) {
  const userId = req.user.id;

  // Respond immediately to avoid timeout (502 Bad Gateway on Render)
  res.json({
    message: 'Google Calendar import started in background'
  });

  // Run the heavy lifting in the background
  (async () => {
    try {
      console.log(`[Background] Starting Google Calendar import for user ${userId}`);
      const result = await GoogleSyncService.importGoogleCalendar(userId, req.io);

      // Re-establish webhook/watch to ensure future updates are caught
      try {
        await GoogleSyncService.watchCalendar(userId);
        console.log(`[Background] Re-established Google Calendar watch for user ${userId}`);
      } catch (watchError) {
        console.error('[Background] Failed to re-establish Google watch:', watchError);
      }

      // Emit final socket event to update frontend
      if (req.io) {
        req.io.to(`user:${userId}`).emit('agenda:updated', {
          agendaId: result.agendaId,
          action: 'imported'
        });
      }
      console.log(`[Background] Google Calendar import completed for user ${userId}`);
    } catch (error) {
      console.error('[Background] Import Google Calendar error:', error);

      // Emit error event to frontend via sockets since the HTTP request is already closed
      if (req.io) {
        req.io.to(`user:${userId}`).emit('google:import:error', {
          message: error.message || 'Failed to import Google Calendar'
        });
      }
    }
  })();
}

/**
 * Handle Google Calendar Webhook
 */
async function handleGoogleWebhook(req, res) {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const expiration = req.headers['x-goog-channel-expiration'];

    console.log(`Received Google Webhook: Channel=${channelId}, State=${resourceState}`);
    console.log('Webhook Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Webhook Body:', JSON.stringify(req.body, null, 2));

    if (resourceState === 'sync') {
      // Initial sync confirmation
      return res.status(200).send('Sync OK');
    }

    if (resourceState === 'exists') {
      // Find the user associated with this channel
      // We need to query agendas by googleChannelId
      // Note: We need to import prisma here or use a service method
      // Since we don't have prisma imported in controller usually, let's use the service.
      // But wait, the service methods usually take userId.
      // We need to find the userId first.

      // Let's assume we can find the agenda by channelId
      // We might need to export prisma from utils/prisma in the controller or add a method in service.
      // For simplicity, let's add a method in service `syncByChannelId`.

      await GoogleSyncService.syncByChannelId(channelId, req.io);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook failed');
  }
}

/**
 * Disconnect Google Calendar
 */
async function disconnectGoogle(req, res) {
  try {
    const userId = req.user.id;

    // Stop watching calendar
    try {
      await GoogleSyncService.stopWatchingCalendar(userId);
    } catch (e) {
      console.warn('Failed to stop Google calendar watch during disconnect:', e);
    }

    // Clear Google tokens and metadata from user
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleId: null,
        googleAccessToken: null,
        googleRefreshToken: null
      }
    });

    // Optionally: You could also delete the "Google Calendar" agenda
    // But maybe the user wants to keep the imported events?
    // Let's just clear the sync metadata but keep the data.

    res.json({ message: 'Google Calendar disconnected successfully' });

  } catch (error) {
    console.error('Disconnect Google error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar', message: error.message });
  }
}

module.exports = {
  importGoogleCalendar,
  handleGoogleWebhook,
  disconnectGoogle
};
