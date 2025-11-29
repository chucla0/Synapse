const express = require('express');
const router = express.Router();
const integrationsController = require('./integrations.controller');
const { authenticateToken } = require('../../middleware/auth');

/**
 * POST /api/integrations/google/import
 * Import events from Google Calendar
 */
router.post('/google/import', authenticateToken, integrationsController.importGoogleCalendar);

module.exports = router;
