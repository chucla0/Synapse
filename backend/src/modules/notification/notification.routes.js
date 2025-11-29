const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getNotificationDetails,
  markAsRead,
  markAllAsRead,
  markAsUnread,
  deleteNotification,
} = require('./notification.controller');
const { authenticateToken } = require('../../middleware/auth');

router.get('/', authenticateToken, getNotifications);
router.get('/:id', authenticateToken, getNotificationDetails);
router.post('/:id/read', authenticateToken, markAsRead);
router.post('/read-all', authenticateToken, markAllAsRead);
router.post('/:id/unread', authenticateToken, markAsUnread);
router.delete('/:id', authenticateToken, deleteNotification);

module.exports = router;