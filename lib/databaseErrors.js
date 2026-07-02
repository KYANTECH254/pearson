function isDatabaseConnectionError(error) {
  return Boolean(
    error &&
      (error.name === "PrismaClientInitializationError" ||
        error.code === "P1001" ||
        /can't reach database server/i.test(error.message || ""))
  );
}

function databaseTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "the configured database";
  }
}

module.exports = {
  databaseTarget,
  isDatabaseConnectionError,
};
