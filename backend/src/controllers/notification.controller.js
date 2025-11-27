const prisma = require('../lib/prisma');

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        agenda: {
          select: { id: true, name: true },
        },
        event: {
          select: { id: true, title: true },
        },
      },
    });
    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

async function getNotificationDetails(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        agenda: {
          include: {
            agendaUsers: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
            owner: { select: { id: true, name: true, avatar: true } },
          },
        },
        event: {
          include: {
            attachments: true,
            links: true,
            creator: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!notification || notification.recipientId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('Get notification details error:', error);
    res.status(500).json({ error: 'Failed to fetch notification details' });
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.recipientId !== userId) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

module.exports = {
  getNotifications,
  getNotificationDetails,
  markAsRead,
  markAllAsRead,
};