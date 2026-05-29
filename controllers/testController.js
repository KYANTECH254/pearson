const prisma = require("../lib/prisma");
const crypto = require("crypto");
const { parseJsonBody, sendJson } = require("../lib/http");
const { requireUser, requireAdmin } = require("./userController");
const { publicUser } = require("./authController");

function parseTestDate(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMetadata(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch (error) {
    return null;
  }
}

function parseNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseNullableInt(value) {
  const number = parseNullableNumber(value);
  return number === null ? null : Math.round(number);
}

function randomDigits(length) {
  var digits = "";

  while (digits.length < length) {
    digits += String(Math.floor(Math.random() * 10));
  }

  return digits;
}

function randomReportCode() {
  return Math.random().toString(36).slice(2, 8).padEnd(6, "x") + randomDigits(4);
}

function randomHexId(length = 24) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

function scoreReportData(body, test) {
  const metadata = {
    ...(parseMetadata(body.metadata) || {}),
    ...(parseMetadata(body.reportMetadata) || {}),
  };
  const registrationId = String(body.registrationId || (metadata && metadata.registrationId) || "").trim();
  const reportCode = String(body.reportCode || (metadata && metadata.reportCode) || "").trim();
  const validUntil = body.validUntil ? parseTestDate(body.validUntil) : null;
  const testTime = String(body.testTime || (metadata && metadata.testTime) || "").trim();
  const testCenterId = String(body.testCenterId || (metadata && metadata.testCenterId) || "").trim();

  return {
    id: randomHexId(),
    reportCode: reportCode || randomReportCode(),
    registrationId: registrationId || randomDigits(9),
    testTime: testTime || null,
    testCenterId: testCenterId || null,
    testCenterName: String(body.testCenterName || (metadata && metadata.testCenterName) || "Navitas English Test Centre- Brisbane").trim(),
    testCenterAddress1: String(body.testCenterAddress1 || (metadata && metadata.testCenterAddress1) || "Suite 3, Level 8 East Tower").trim(),
    testCenterAddress2: String(body.testCenterAddress2 || (metadata && metadata.testCenterAddress2) || "410 Ann Street").trim(),
    testCenterCity: String(body.testCenterCity || (metadata && metadata.testCenterCity) || "Brisbane").trim(),
    testCenterState: String(body.testCenterState || (metadata && metadata.testCenterState) || "QLD").trim(),
    testCenterCountry: String(body.testCenterCountry || (metadata && metadata.testCenterCountry) || "AUS").trim(),
    testCenterPostalCode: String(body.testCenterPostalCode || (metadata && metadata.testCenterPostalCode) || "4000").trim(),
    timezone: String(body.timezone || (metadata && metadata.timezone) || "AEST").trim(),
    overallScore: parseNullableInt(body.overallScore !== undefined ? body.overallScore : test.score),
    listeningScore: parseNullableInt(body.listeningScore),
    readingScore: parseNullableInt(body.readingScore),
    speakingScore: parseNullableInt(body.speakingScore),
    writingScore: parseNullableInt(body.writingScore),
    validUntil,
    metadata: Object.keys(metadata).length ? metadata : null,
  };
}

function scoreReportUpdateData(body, test) {
  const data = {};
  const metadata = {
    ...(parseMetadata(body.metadata) || {}),
    ...(parseMetadata(body.reportMetadata) || {}),
  };
  [
    "reportCode",
    "registrationId",
    "testTime",
    "testCenterId",
    "testCenterName",
    "testCenterAddress1",
    "testCenterAddress2",
    "testCenterCity",
    "testCenterState",
    "testCenterCountry",
    "testCenterPostalCode",
    "timezone",
  ].forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = String(body[field] || "").trim() || null;
    }
  });

  [
    "overallScore",
    "listeningScore",
    "readingScore",
    "speakingScore",
    "writingScore",
  ].forEach((field) => {
    if (body[field] !== undefined || (field === "overallScore" && body.score !== undefined)) {
      data[field] = parseNullableInt(body[field] !== undefined ? body[field] : test.score);
    }
  });

  if (body.validUntil !== undefined) {
    data.validUntil = body.validUntil ? parseTestDate(body.validUntil) : null;
  }

  if (Object.keys(metadata).length) {
    data.metadata = metadata;
  }

  return data;
}

async function ensureScoreReportStore() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Test" (
      "id" TEXT PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES "User"("id"),
      "title" TEXT NOT NULL,
      "description" TEXT,
      "score" DOUBLE PRECISION,
      "status" TEXT,
      "testDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TestScoreReport" (
      "id" TEXT PRIMARY KEY,
      "testId" TEXT NOT NULL UNIQUE REFERENCES "Test"("id") ON DELETE CASCADE,
      "reportCode" TEXT,
      "registrationId" TEXT,
      "testTime" TEXT,
      "testCenterId" TEXT,
      "testCenterName" TEXT,
      "testCenterAddress1" TEXT,
      "testCenterAddress2" TEXT,
      "testCenterCity" TEXT,
      "testCenterState" TEXT,
      "testCenterCountry" TEXT,
      "testCenterPostalCode" TEXT,
      "timezone" TEXT,
      "overallScore" INTEGER,
      "listeningScore" INTEGER,
      "readingScore" INTEGER,
      "speakingScore" INTEGER,
      "writingScore" INTEGER,
      "validUntil" TIMESTAMP(3),
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure existing tables are migrated if necessary (simplified for this task)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Test"
    ALTER COLUMN "id" TYPE TEXT;
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TestScoreReport"
    ALTER COLUMN "id" TYPE TEXT,
    ALTER COLUMN "testId" TYPE TEXT;
  `).catch(() => {});
}

function includeScoreReport() {
  return { scoreReport: true };
}

async function listUserTests(req, res) {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const tests = await prisma.test.findMany({
    where: { userId: user.id },
    orderBy: { testDate: "desc" },
    include: includeScoreReport(),
  });

  sendJson(res, 200, { tests });
}

async function createUserTest(req, res) {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const body = await parseJsonBody(req);
  const title = String(body.title || body.testName || "").trim();
  const score = parseNullableNumber(body.score);
  const description = String(body.description || "").trim();
  const status = String(body.status || "").trim() || null;
  const testDate = parseTestDate(body.testDate);
  const metadata = parseMetadata(body.metadata);

  if (!title) {
    sendJson(res, 400, { error: "Test title is required." });
    return;
  }

  const test = await prisma.test.create({
    data: {
      id: randomHexId(),
      userId: user.id,
      title,
      description: description || null,
      score,
      status,
      testDate: testDate || new Date(),
      metadata,
      scoreReport: {
        create: scoreReportData(body, { score }),
      },
    },
    include: includeScoreReport(),
  });

  sendJson(res, 201, { test });
}

async function listAllTests(req, res) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const tests = await prisma.test.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, scoreReport: true },
  });

  sendJson(
    res,
    200,
    {
      tests: tests.map((test) => ({
        ...test,
        user: publicUser(test.user),
      })),
    }
  );
}

async function createAdminTest(req, res) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const body = await parseJsonBody(req);
  const userId = Number(body.userId || 0);
  const title = String(body.title || body.testName || "").trim();
  const score = parseNullableNumber(body.score);
  const description = String(body.description || "").trim();
  const status = String(body.status || "").trim() || null;
  const testDate = parseTestDate(body.testDate);
  const metadata = parseMetadata(body.metadata);

  if (!userId || !title) {
    sendJson(res, 400, { error: "User and test title are required." });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!existingUser) {
    sendJson(res, 404, { error: "User not found." });
    return;
  }

  const test = await prisma.test.create({
    data: {
      id: randomHexId(),
      userId: existingUser.id,
      title,
      description: description || null,
      score,
      status,
      testDate: testDate || new Date(),
      metadata,
      scoreReport: {
        create: scoreReportData(body, { score }),
      },
    },
    include: includeScoreReport(),
  });

  sendJson(res, 201, { test });
}

async function updateAdminTest(req, res, id) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const body = await parseJsonBody(req);
  const userId = body.userId !== undefined ? Number(body.userId || 0) : null;
  const title = body.title !== undefined || body.testName !== undefined ? String(body.title || body.testName || "").trim() : undefined;
  const score = body.score !== undefined ? parseNullableNumber(body.score) : undefined;
  const testDate = body.testDate !== undefined ? parseTestDate(body.testDate) : undefined;
  const metadata = body.metadata !== undefined ? parseMetadata(body.metadata) : undefined;
  const data = {};

  if (title !== undefined && !title) {
    sendJson(res, 400, { error: "Test title is required." });
    return;
  }

  if (userId !== null) {
    if (!userId) {
      sendJson(res, 400, { error: "User is required." });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
      sendJson(res, 404, { error: "User not found." });
      return;
    }

    data.userId = existingUser.id;
  }

  if (title !== undefined) data.title = title;
  if (body.description !== undefined) data.description = String(body.description || "").trim() || null;
  if (body.status !== undefined) data.status = String(body.status || "").trim() || null;
  if (score !== undefined) data.score = score;
  if (testDate !== undefined) data.testDate = testDate || new Date();
  if (metadata !== undefined) data.metadata = metadata;

  const existingTest = await prisma.test.findUnique({
    where: { id },
    include: includeScoreReport(),
  });

  if (!existingTest) {
    sendJson(res, 404, { error: "Test not found." });
    return;
  }

  const reportData = scoreReportUpdateData(body, { score: score === undefined ? existingTest.score : score });

  if (Object.keys(reportData).length) {
    data.scoreReport = {
      upsert: {
        create: scoreReportData(body, { score: score === undefined ? existingTest.score : score }),
        update: reportData,
      },
    };
  }

  const test = await prisma.test.update({
    where: { id: existingTest.id },
    data,
    include: { user: true, scoreReport: true },
  });

  sendJson(res, 200, { test: { ...test, user: publicUser(test.user) } });
}

async function deleteAdminTest(req, res, id) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  if (!id) {
    sendJson(res, 400, { error: "Invalid test ID." });
    return;
  }

  try {
    await prisma.test.delete({
      where: { id },
    });

    sendJson(res, 200, { ok: true });
  } catch (error) {
    if (error.code === "P2025") {
      sendJson(res, 404, { error: "Test not found." });
      return;
    }

    throw error;
  }
}

async function getUserTest(req, res, id) {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const isLatest = !id || id === "latest";
  const where = { userId: user.id };

  if (!isLatest) {
    where.id = id;
  }

  const test = await prisma.test.findFirst({
    where,
    orderBy: isLatest ? { testDate: "desc" } : undefined,
    include: { user: true, scoreReport: true },
  });

  if (!test) {
    sendJson(res, 404, { error: "Test not found." });
    return;
  }

  sendJson(res, 200, { test: { ...test, user: publicUser(test.user) } });
}

module.exports = {
  listUserTests,
  createUserTest,
  listAllTests,
  createAdminTest,
  updateAdminTest,
  deleteAdminTest,
  getUserTest,
  ensureScoreReportStore,
};
