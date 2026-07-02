const prisma = require("../lib/prisma");
const { formatPteId, randomPteNumber } = require("../lib/pteId");

async function uniquePteId() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const pteId = formatPteId(randomPteNumber());
    const existing = await prisma.user.findUnique({ where: { pteId } });

    if (!existing) {
      return pteId;
    }
  }

  throw new Error("Unable to generate a unique PTE ID.");
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { pteId: null },
        { pteId: { startsWith: "PTE000000" } },
      ],
    },
    orderBy: { id: "asc" },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { pteId: await uniquePteId() },
    });
  }

  console.log(`Updated ${users.length} user PTE IDs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
