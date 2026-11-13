import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { labTestId: { not: null }, items: { none: {} } },
    include: { labTest: { include: { test: true } } },
  });

  for (const b of bookings) {
    if (!b.labTest) continue;
    await prisma.bookingItem.create({
      data: {
        bookingId: b.id,
        labTestId: b.labTest.id,
        testName: b.labTest.test.name,
        price: b.labTest.price,
        discount: b.labTest.discount,
        amount: b.totalAmount,
      },
    });
  }

  console.log("Backfilled " + bookings.length + " bookings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
