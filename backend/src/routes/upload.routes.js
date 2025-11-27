const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/uploads/avatar
 * Upload a new avatar image.
 * This route is protected.
 */
router.post('/avatar', authenticateToken, uploadController.uploadAvatar);
router.post('/file', authenticateToken, uploadController.uploadAttachment);

module.exports = router;
