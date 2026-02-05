const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.completeEvent.deleteMany();
  await prisma.seatEvent.deleteMany();
  await prisma.statusLog.deleteMany();
  await prisma.party.deleteMany();
  await prisma.table.deleteMany();
  await prisma.location.deleteMany();
  await prisma.restaurantGroup.deleteMany();

  const group = await prisma.restaurantGroup.create({
    data: { id: 'grp_urb23', name: 'Urban Bites Collective' },
  });

  const locDowntown = await prisma.location.create({
    data: {
      id: 'loc_downtown',
      groupId: group.id,
      name: 'Downtown',
      address: '123 Main St',
      city: 'New York',
      isActive: true,
    },
  });

  const locUptown = await prisma.location.create({
    data: {
      id: 'loc_uptown',
      groupId: group.id,
      name: 'Uptown',
      address: '456 Park Ave',
      city: 'New York',
      isActive: true,
    },
  });

  const tables = [];
  for (let i = 1; i <= 12; i++) {
    const section = i <= 4 ? 'Bar' : i <= 8 ? 'Patio' : 'Main';
    const capacity = i % 3 === 0 ? 4 : i % 2 === 0 ? 6 : 2;
    const table = await prisma.table.create({
      data: {
        id: `tbl_dt_${i}`,
        locationId: locDowntown.id,
        tableId: `T${i}`,
        capacity,
        section,
        isActive: true,
      },
    });
    tables.push(table);
  }

  const partyNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const parties = [];
  for (let i = 0; i < 6; i++) {
    const party = await prisma.party.create({
      data: {
        id: `party_${i + 1}`,
        locationId: locDowntown.id,
        name: partyNames[i],
        partySize: (i % 4) + 2,
        phone: `555-${String(1000 + i).slice(-4)}`,
        status: i < 3 ? 'seated' : 'waiting',
        checkInTime: new Date(Date.now() - i * 30 * 60000),
      },
    });
    parties.push(party);
  }

  for (let i = 0; i < 3; i++) {
    await prisma.seatEvent.create({
      data: {
        id: `se_${i + 1}`,
        partyId: parties[i].id,
        tableId: tables[i].id,
        seatTime: new Date(Date.now() - (i + 1) * 60 * 60000),
      },
    });
  }

  const completeTimestamps = [
    Date.now() - 2 * 60 * 60000,
    Date.now() - 1.5 * 60 * 60000,
    Date.now() - 1 * 60 * 60000,
  ];

  for (let i = 0; i < completeTimestamps.length; i++) {
    await prisma.completeEvent.create({
      data: {
        id: `ce_${i + 1}`,
        partyId: parties[i].id,
        tableId: tables[i].id,
        completeTime: new Date(completeTimestamps[i]),
      },
    });
  }

  console.log('✅ Database seeded successfully');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });