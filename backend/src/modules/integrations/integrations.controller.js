const GoogleSyncService = require('../google-sync/google-sync.service');

/**
 * Import Google Calendar events
 */
async function importGoogleCalendar(req, res) {
  try {
    const userId = req.user.id;
    const result = await GoogleSyncService.importGoogleCalendar(userId);
    
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

module.exports = {
  importGoogleCalendar
};
