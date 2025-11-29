const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findFirst({
    where: { title: 'Homework Assignment' },
    include: {
      agenda: {
        include: {
          agendaUsers: {
            include: { user: true }
          }
        }
      }
    }
  });

  console.log('Event:', JSON.stringify(event, null, 2));

  if (event) {
    const bob = event.agenda.agendaUsers.find(au => au.user.email === 'bob@example.com');
    console.log('Bob Role:', bob ? bob.role : 'Not found');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
