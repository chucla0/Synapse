const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'iizan.cruzz@gmail.com';
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user) {
    console.log(`User ${email} found. Deleting...`);
    await prisma.user.delete({ where: { email } });
    console.log('User deleted.');
  } else {
    console.log(`User ${email} not found.`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
