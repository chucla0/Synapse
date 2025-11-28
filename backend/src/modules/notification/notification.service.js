const prisma = require('../../lib/prisma.js');

class NotificationService {
  async createNotification({
    recipientId,
    senderId,
    type,
    agendaId,
    eventId,
    data,
  }) {
    try {
      await prisma.notification.create({
        data: {
          recipientId,
          senderId,
          type,
          agendaId,
          eventId,
          data,
        },
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      // Depending on the use case, you might want to throw the error
      // or handle it gracefully. For now, we'll log it.
    }
  }

  async createNotificationsForAgendaMembers({
    agendaId,
    senderId,
    type,
    eventId,
    data,
    excludeSender = true,
  }) {
    try {
      const agenda = await prisma.agenda.findUnique({
        where: { id: agendaId },
        include: { agendaUsers: true },
      });

      if (!agenda) return;

      const recipientIds = agenda.agendaUsers.map(user => user.userId);
      if (agenda.ownerId) {
        recipientIds.push(agenda.ownerId);
      }

      let finalRecipientIds = [...new Set(recipientIds)]; // Remove duplicates

      if (excludeSender) {
        finalRecipientIds = finalRecipientIds.filter(id => id !== senderId);
      }
      
      if (finalRecipientIds.length > 0) {
        await prisma.notification.createMany({
          data: finalRecipientIds.map(recipientId => ({
            recipientId,
            senderId,
            type,
            agendaId,
            eventId,
            data,
          })),
        });
      }
    } catch (error) {
      console.error('Error creating notifications for agenda members:', error);
    }
  }
}

module.exports = new NotificationService();
