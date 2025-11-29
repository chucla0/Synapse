const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed check...');

  // Check if database is already seeded
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('✅ Database already seeded. Skipping seed.');
    return;
  }

  console.log('🌱 Database is empty. Starting seed process...');

  // 1. Clean Database (Safety check, though count was 0)
  await prisma.notification.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.link.deleteMany();
  await prisma.event.deleteMany();
  await prisma.agendaUser.deleteMany();
  await prisma.agenda.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Database cleaned');

  // 2. Create Users
  const password = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Owner',
      email: 'alice@example.com',
      password,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
    }
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob User',
      email: 'bob@example.com',
      password,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
    }
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Observer',
      email: 'charlie@example.com',
      password,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
    }
  });

  console.log('👥 Users created: Alice, Bob, Charlie');

  // --- 3. PERSONAL AGENDA (Alice) ---
  const personalAgenda = await prisma.agenda.create({
    data: {
      name: 'Alice Personal',
      description: 'Private personal agenda',
      type: 'PERSONAL',
      color: '#3B82F6',
      ownerId: alice.id
    }
  });

  await prisma.event.create({
    data: {
      title: 'Personal Public Event',
      description: 'Visible to Alice',
      startTime: new Date(new Date().setHours(10, 0, 0, 0)),
      endTime: new Date(new Date().setHours(11, 0, 0, 0)),
      agendaId: personalAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED'
    }
  });

  await prisma.event.create({
    data: {
      title: 'Personal Private Event',
      description: 'Visible to Alice only',
      startTime: new Date(new Date().setHours(12, 0, 0, 0)),
      endTime: new Date(new Date().setHours(13, 0, 0, 0)),
      agendaId: personalAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true
    }
  });

  console.log('📅 Personal Agenda created');

  // --- 4. COLLABORATIVE AGENDA (Alice & Bob) ---
  const collabAgenda = await prisma.agenda.create({
    data: {
      name: 'Project Alpha',
      description: 'Collaborative work',
      type: 'COLABORATIVA',
      color: '#10B981',
      ownerId: alice.id,
      agendaUsers: {
        create: [
          { userId: bob.id, role: 'EDITOR' }
        ]
      }
    }
  });

  await prisma.event.create({
    data: {
      title: 'Collab Team Meeting',
      description: 'Visible to both',
      startTime: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
      endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
      agendaId: collabAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED'
    }
  });

  await prisma.event.create({
    data: {
      title: 'Collab Private Note',
      description: 'Visible to both (Collaborative rules)',
      startTime: new Date(new Date().setDate(new Date().getDate() + 1)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
      agendaId: collabAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true
    }
  });

  console.log('📅 Collaborative Agenda created');

  // --- 5. LABORAL AGENDA (Alice=Chief, Bob=Employee) ---
  const workAgenda = await prisma.agenda.create({
    data: {
      name: 'Tech Corp',
      description: 'Work agenda',
      type: 'LABORAL',
      color: '#F59E0B',
      ownerId: alice.id, // Alice is Owner (Chief logic applies)
      agendaUsers: {
        create: [
          { userId: bob.id, role: 'EMPLOYEE' }
        ]
      }
    }
  });

  // Event 1: Public by Chief (Visible to all)
  await prisma.event.create({
    data: {
      title: 'Company All Hands',
      description: 'Visible to everyone',
      startTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      agendaId: workAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED'
    }
  });

  // Event 2: Private by Chief (Hidden from Employee)
  await prisma.event.create({
    data: {
      title: 'Executive Strategy',
      description: 'Private to Chief. Bob should NOT see this.',
      startTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      agendaId: workAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true
    }
  });

  // Event 3: Private by Chief, Shared with Bob (Visible to Bob)
  await prisma.event.create({
    data: {
      title: '1:1 Alice & Bob',
      description: 'Private but shared with Bob. Bob SHOULD see this.',
      startTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      agendaId: workAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true,
      sharedWithUsers: {
        connect: [{ id: bob.id }]
      }
    }
  });

  // Event 4: Private by Employee (Visible to Employee and Chief)
  await prisma.event.create({
    data: {
      title: 'Bob Private Task',
      description: 'Created by Bob. Alice (Chief) SHOULD see this.',
      startTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 2)),
      agendaId: workAgenda.id,
      creatorId: bob.id,
      status: 'CONFIRMED',
      isPrivate: true
    }
  });

  console.log('📅 Laboral Agenda created');

  // --- 6. EDUCATIVA AGENDA (Alice=Professor, Bob=Student) ---
  const schoolAgenda = await prisma.agenda.create({
    data: {
      name: 'Physics 101',
      description: 'School class',
      type: 'EDUCATIVA',
      color: '#8B5CF6',
      ownerId: alice.id, // Alice is Owner (Professor logic)
      agendaUsers: {
        create: [
          { userId: bob.id, role: 'STUDENT' }
        ]
      }
    }
  });

  // Event 1: Public Class (Visible to all)
  await prisma.event.create({
    data: {
      title: 'Lecture 1',
      description: 'Visible to everyone',
      startTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      agendaId: schoolAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED'
    }
  });

  // Event 2: Private Teacher Note (Hidden from Student)
  await prisma.event.create({
    data: {
      title: 'Exam Prep Notes',
      description: 'Private to Professor. Bob should NOT see this.',
      startTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      agendaId: schoolAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true
    }
  });

  // Event 3: Private but Visible to Students (Visible to Student)
  await prisma.event.create({
    data: {
      title: 'Homework Assignment',
      description: 'Private but marked visible to students. Bob SHOULD see this.',
      startTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      endTime: new Date(new Date().setDate(new Date().getDate() + 3)),
      agendaId: schoolAgenda.id,
      creatorId: alice.id,
      status: 'CONFIRMED',
      isPrivate: true,
      visibleToStudents: true
    }
  });

  console.log('📅 Educativa Agenda created');
  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
