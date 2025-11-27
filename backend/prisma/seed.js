const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Create Users
  const password = await bcrypt.hash('password123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@test.com' },
    update: {},
    create: {
      email: 'user1@test.com',
      name: 'Test User 1',
      password,
      avatar: 'https://picsum.photos/seed/user1/150',
    },
  });
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@test.com' },
    update: {},
    create: {
      email: 'user2@test.com',
      name: 'Test User 2',
      password,
      avatar: 'https://picsum.photos/seed/user2/150',
    },
  });
  const user3 = await prisma.user.upsert({
    where: { email: 'user3@test.com' },
    update: {},
    create: {
      email: 'user3@test.com',
      name: 'Test User 3',
      password,
      avatar: 'https://picsum.photos/seed/user3/150',
    },
  });

  console.log('Created users:', { user1, user2, user3 });

  // Create Agendas
  const agenda1 = await prisma.agenda.create({
    data: {
      name: 'Collaborative Agenda',
      type: 'COLABORATIVA',
      ownerId: user1.id,
    },
  });

  await prisma.agendaUser.create({
    data: {
      agendaId: agenda1.id,
      userId: user2.id,
      role: 'VIEWER',
    },
  });

  await prisma.event.create({
    data: {
      title: 'Test Event',
      agendaId: agenda1.id,
      creatorId: user1.id,
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + 3600000),
    },
  });

  const agenda2 = await prisma.agenda.create({
    data: {
      name: 'Work Agenda',
      type: 'LABORAL',
      ownerId: user1.id,
    },
  });

  await prisma.notification.create({
    data: {
      recipientId: user3.id,
      senderId: user1.id,
      agendaId: agenda2.id,
      type: 'AGENDA_INVITE',
    },
  });
  
  const agenda3 = await prisma.agenda.create({
    data: {
      name: 'Educational Agenda',
      type: 'EDUCATIVA',
      ownerId: user2.id,
    },
  });

  // Create Specific Role Users for Testing
  const chief = await prisma.user.upsert({
    where: { email: 'chief@test.com' },
    update: {},
    create: {
      email: 'chief@test.com',
      name: 'Chief User',
      password,
      avatar: 'https://picsum.photos/seed/chief/150',
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@test.com' },
    update: {},
    create: {
      email: 'employee@test.com',
      name: 'Employee User',
      password,
      avatar: 'https://picsum.photos/seed/employee/150',
    },
  });

  console.log('Created role users:', { chief, employee });

  // Create Laboral Agenda for Testing Approvals
  const workAgenda = await prisma.agenda.create({
    data: {
      name: 'Office Work',
      type: 'LABORAL',
      ownerId: chief.id,
      description: 'Main office agenda for testing approvals',
    },
  });

  // Add Employee to Work Agenda
  await prisma.agendaUser.create({
    data: {
      agendaId: workAgenda.id,
      userId: employee.id,
      role: 'EMPLOYEE',
    },
  });

  // Create a Pending Event
  const pendingEvent = await prisma.event.create({
    data: {
      title: 'Vacation Request',
      description: 'Please approve my vacation',
      agendaId: workAgenda.id,
      creatorId: employee.id,
      startTime: new Date(new Date().setDate(new Date().getDate() + 7)), // 1 week from now
      endTime: new Date(new Date().setDate(new Date().getDate() + 8)),
      status: 'PENDING_APPROVAL',
    },
  });

  console.log('Created work agenda and pending event:', { workAgenda, pendingEvent });


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });