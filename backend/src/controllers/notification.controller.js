const prisma = require('../lib/prisma');

/**
 * Get all notifications for current user
 */
async function getAllNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const totalCount = await prisma.notification.count({
      where: { userId }
    });

    res.json({
      notifications,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch notifications',
      message: 'Internal server error' 
    });
  }
}

/**
 * Get unread notifications count
 */
async function getUnreadCount(req, res) {
  try {
    const userId = req.user.id;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({ unreadCount: count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      error: 'Failed to get unread count',
      message: 'Internal server error' 
    });
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ 
        error: 'Notification not found' 
      });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      message: 'Internal server error' 
    });
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark all notifications as read',
      message: 'Internal server error' 
    });
  }
}

/**
 * Delete notification
 */
async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    // Verify notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification) {
      return res.status(404).json({ 
        error: 'Notification not found' 
      });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification',
      message: 'Internal server error' 
    });
  }
}

module.exports = {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
