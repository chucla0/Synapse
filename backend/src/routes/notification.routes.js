const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notifications
 * Get all notifications for current user
 */
router.get('/', notificationController.getAllNotifications);

/**
 * GET /api/notifications/unread
 * Get unread notifications count
 */
router.get('/unread', notificationController.getUnreadCount);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:notificationId/read', notificationController.markAsRead);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', notificationController.deleteNotification);

module.exports = router;
