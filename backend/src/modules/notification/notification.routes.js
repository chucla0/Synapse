const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationDetails,
  markAsRead,
  markAllAsRead,
} = require('./notification.controller');
const { authenticateToken } = require('../../middleware/auth');

router.get('/', authenticateToken, getNotifications);
router.get('/:id', authenticateToken, getNotificationDetails);
router.post('/:id/read', authenticateToken, markAsRead);
router.post('/read-all', authenticateToken, markAllAsRead);

module.exports = router;