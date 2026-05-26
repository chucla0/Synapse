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
 * DELETE /api/integrations/google
 * Disconnect Google Calendar account
 */
router.delete('/google', authenticateToken, integrationsController.disconnectGoogle);

/**
 * POST /api/integrations/google/webhook
 * Handle Google Calendar push notifications
 */
router.post('/google/webhook', integrationsController.handleGoogleWebhook);

module.exports = router;
