const prisma = require('../../lib/prisma.js');

class NotificationService {
  setIo(io) {
    this.io = io;
  }

  async createNotification({
    recipientId,
    senderId,
    type,
    agendaId,
    eventId,
    data,
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          recipientId,
          senderId,
          type,
          agendaId,
          eventId,
          data,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      });

      // Emit socket event
      if (this.io) {
        this.io.to(`user:${recipientId}`).emit('notification:new', notification);
      }
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
        // We can't easily return all created notifications with createMany
        // So we'll create them in a transaction or just create them and then emit
        // For performance with sockets, we might want to emit individually or as a batch?
        // createMany doesn't return the created records.
        // Let's use a transaction to create and fetch, or just iterate (slower but safer for getting IDs).
        // For MVP, let's stick to createMany for DB performance, but we won't have the exact IDs/timestamps for the socket event unless we fetch them back.
        // Alternatively, we construct the notification object for the socket event manually (it won't have ID, but might be enough for "new notification" badge).
        // BETTER: Fetch the sender info once, then emit. The frontend usually refetches notifications anyway or adds to list.
        // If we want to append to list without refetch, we need the full object.
        // Let's just emit a signal "notification:new" and let frontend refetch or show a toast.
        // The plan said "Emit notification:new".

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

        // Emit to all
        if (this.io) {
          // We need sender info for the toast usually
          const sender = await prisma.user.findUnique({
            where: { id: senderId },
            select: { id: true, name: true, avatar: true }
          });

          finalRecipientIds.forEach(recipientId => {
            this.io.to(`user:${recipientId}`).emit('notification:new', {
              type,
              sender,
              data,
              isRead: false,
              createdAt: new Date(),
              // We lack the ID here, so frontend might need to refetch to get actionable IDs
              // But for a toast it's fine.
            });
          });
        }
      }
    } catch (error) {
      console.error('Error creating notifications for agenda members:', error);
    }
  }
}

module.exports = new NotificationService();
