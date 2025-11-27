const express = require('express');
const router = express.Router();
const linkController = require('../controllers/link.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/links/preview
 * Get preview data for a URL
 */
router.get('/preview', authenticateToken, linkController.getLinkPreview);

module.exports = router;
