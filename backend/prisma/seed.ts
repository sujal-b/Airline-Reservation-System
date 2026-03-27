import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skyvoyage.com' },
    update: {},
    create: { email: 'admin@skyvoyage.com', password: adminPassword, name: 'Admin', role: 'ADMIN' },
  });

  const passenger = await prisma.user.upsert({
    where: { email: 'passenger@example.com' },
    update: {},
    create: { email: 'passenger@example.com', password: userPassword, name: 'John Doe', role: 'PASSENGER' },
  });

  console.log(`  ✅ Users: admin=${admin.id}, passenger=${passenger.id}`);

  // 2. Create aircraft (reference data for the system)
  const aircraft = await Promise.all([
    prisma.aircraft.create({ data: { model: 'Boeing 787', capacity: 180 } }),
    prisma.aircraft.create({ data: { model: 'Airbus A380', capacity: 240 } }),
    prisma.aircraft.create({ data: { model: 'Boeing 777', capacity: 200 } }),
    prisma.aircraft.create({ data: { model: 'Airbus A350', capacity: 220 } }),
    prisma.aircraft.create({ data: { model: 'Airbus A320', capacity: 150 } }),
  ]);

  console.log(`  ✅ Aircraft: ${aircraft.length} created`);

  // NOTE: No fake flights or seats are seeded.
  // Flights come from the AviationStack API (real data).
  // Seats & bookings are created dynamically when a user books.

  console.log('🎉 Seeding complete! (Users + Aircraft only — flights come from live API)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
