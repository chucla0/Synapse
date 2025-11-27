const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.event.findFirst({
    where: { title: 'Vacation Request' },
    include: { agenda: true }
  });
  console.log('Event:', event);
  
  if (event) {
    const chief = await prisma.user.findUnique({ where: { email: 'chief@test.com' } });
    console.log('Chief ID:', chief.id);
    console.log('Agenda Owner ID:', event.agenda.ownerId);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
