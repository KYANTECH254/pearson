function formatPteId(number) {
  return `PTE${String(number).padStart(9, "0")}`;
}

function randomPteNumber() {
  return Math.floor(100000000 + Math.random() * 900000000);
}

async function assignPteId(prisma, user) {
  if (!user || user.pteId) {
    return user;
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      return await prisma.user.update({
        where: { id: user.id },
        data: { pteId: formatPteId(randomPteNumber()) },
      });
    } catch (error) {
      if (error.code !== "P2002") {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique PTE ID.");
}

module.exports = {
  assignPteId,
  formatPteId,
  randomPteNumber,
};
