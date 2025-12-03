const express = require('express');
const router = express.Router();
const integrationsController = require('./integrations.controller');
const { authenticateToken } = require('../../middleware/auth');

/**
 * POST /api/integrations/google/import
 * Import events from Google Calendar
 */
router.post('/google/import', authenticateToken, integrationsController.importGoogleCalendar);

/**
 * POST /api/integrations/google/webhook
 * Handle Google Calendar push notifications
 */
router.post('/google/webhook', integrationsController.handleGoogleWebhook);

module.exports = router;
