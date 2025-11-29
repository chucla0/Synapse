const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } });
  if (!bob) {
    console.log('Bob not found');
    return;
  }
  const userId = bob.id;
  console.log('User ID:', userId);

  const where = {
    AND: [
      {
        OR: [
          { agenda: { ownerId: userId } },
          { agenda: { agendaUsers: { some: { userId } } } }
        ]
      }
    ]
  };

  const events = await prisma.event.findMany({
    where,
    include: {
      agenda: {
        select: { id: true, name: true, color: true, type: true, ownerId: true },
      },
      creator: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      sharedWithUsers: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      _count: {
        select: { attachments: true, links: true }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  console.log(`Found ${events.length} total events for Bob`);

  const visibleEvents = await Promise.all(events.map(async (event) => {
    if (!event.isPrivate) return event;
    if (event.creatorId === userId) return event;

    const agenda = event.agenda;
    let userRole = null;
    if (agenda.ownerId === userId) {
      userRole = 'OWNER';
    } else {
      const agendaUser = await prisma.agendaUser.findUnique({
        where: { agendaId_userId: { agendaId: agenda.id, userId } }
      });
      userRole = agendaUser?.role;
    }

    if (event.title === 'Homework Assignment') {
      console.log('DEBUG VISIBILITY:', {
        user: userId,
        role: userRole,
        agendaType: agenda.type,
        isPrivate: event.isPrivate,
        visibleToStudents: event.visibleToStudents,
        sharedWith: event.sharedWithUsers.map(u => u.id)
      });
    }

    if (!userRole) return null;
    if (userRole === 'OWNER') return event;

    if (agenda.type === 'PERSONAL') return event;
    if (agenda.type === 'COLABORATIVA') return event;

    if (agenda.type === 'LABORAL') {
      if (userRole === 'CHIEF') return event;
      if (userRole === 'EMPLOYEE') {
        const isShared = event.sharedWithUsers.some(u => u.id === userId);
        if (isShared) return event;
        return null;
      }
    }

    if (agenda.type === 'EDUCATIVA') {
      if (userRole === 'PROFESSOR' || userRole === 'TEACHER') return event;
      if (userRole === 'STUDENT') {
        if (event.visibleToStudents) return event;
        const isShared = event.sharedWithUsers.some(u => u.id === userId);
        if (isShared) return event;
        return null;
      }
    }

    const isShared = event.sharedWithUsers.some(u => u.id === userId);
    if (isShared) return event;

    return null;
  }));

  const finalEvents = visibleEvents.filter(e => e !== null);
  console.log(`Visible events: ${finalEvents.length}`);
  const homework = finalEvents.find(e => e.title === 'Homework Assignment');
  console.log('Homework Assignment visible?', !!homework);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
