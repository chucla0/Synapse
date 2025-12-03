const GoogleSyncService = require('../google-sync/google-sync.service');

/**
 * Import Google Calendar events
 */
async function importGoogleCalendar(req, res) {
  try {
    const userId = req.user.id;
    const result = await GoogleSyncService.importGoogleCalendar(userId);

    // Emit socket event to update frontend
    if (req.io) {
      req.io.to(`user:${userId}`).emit('agenda:updated', {
        agendaId: result.agendaId,
        action: 'imported'
      });
      // Also emit event:created if we want to be granular, but agenda:updated should trigger a refetch of events too
      // based on our frontend logic.
    }

    res.json({
      message: 'Google Calendar imported successfully',
      ...result
    });
  } catch (error) {
    console.error('Import Google Calendar error:', error);
    res.status(500).json({
      error: 'Failed to import Google Calendar',
      message: error.message
    });
  }
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

module.exports = {
  importGoogleCalendar,
  handleGoogleWebhook
};
