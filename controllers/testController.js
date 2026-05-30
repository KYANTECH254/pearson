const prisma = require("../lib/prisma");
const crypto = require("crypto");
const fs = require("fs");
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

function chromiumExecutablePath() {
  return [process.env.PUPPETEER_EXECUTABLE_PATH, "/usr/bin/chromium", "/usr/bin/google-chrome"].find((file) => file && fs.existsSync(file));
}

function pdfFilename(test) {
  const user = test.user || {};
  const report = test.scoreReport || {};
  const name = [user.firstName, user.lastName].filter(Boolean).join("_") || user.username || "score-report";
  const registrationId = report.registrationId || test.id;

  return `${name}_${registrationId}.pdf`.replace(/[^\w.-]+/g, "_");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPdfDate(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatGender(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized === "m" || normalized === "male") return "Male";
  if (normalized === "f" || normalized === "female") return "Female";
  if (normalized) return "X/Other";
  return "";
}

function addYears(dateValue, years) {
  const date = dateValue ? new Date(dateValue) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  date.setFullYear(date.getFullYear() + years);
  return date;
}

function scoreValue(test, report, key) {
  const value = key === "overallScore" && report[key] == null ? test.score : report[key];

  return value == null || value === "" ? "" : String(Math.round(Number(value)));
}

function scoreReportPdfHtml(test) {
  const report = test.scoreReport || {};
  const metadata = { ...(test.metadata || {}), ...(report.metadata || {}) };
  const user = test.user || {};
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
  const displayName = [user.lastName, user.firstName].filter(Boolean).join(" ") || fullName;
  const registrationId = report.registrationId || metadata.registrationId || "";
  const reportCode = report.reportCode || metadata.reportCode || "";
  const validUntil = report.validUntil || metadata.validUntil || addYears(test.testDate, 2);
  const testCenterName = report.testCenterName || metadata.testCenterName || "";
  const testCenterCountry = report.testCenterCountry || metadata.testCenterCountry || "";
  const scores = {
    Listening: scoreValue(test, report, "listeningScore"),
    Reading: scoreValue(test, report, "readingScore"),
    Speaking: scoreValue(test, report, "speakingScore"),
    Writing: scoreValue(test, report, "writingScore"),
  };
  const overall = scoreValue(test, report, "overallScore");
  const skillRows = Object.entries(scores).map(([name, value]) => `
    <div class="skill-row">
      <div class="skill-name">${escapeHtml(name)}</div>
      <div class="skill-track"><span style="width:${Number(value) || 0}%"></span></div>
      <div class="skill-score">${escapeHtml(value)}</div>
    </div>
  `).join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #242424; font-family: Arial, Helvetica, sans-serif; }
    .page { width: 210mm; min-height: 297mm; padding: 14mm 16mm 12mm; }
    .top-band { background: #16b3a8; color: #1f3440; padding: 12mm 10mm 8mm; }
    .title { font-size: 31px; font-weight: 700; letter-spacing: .1px; }
    .code { font-size: 13px; margin-top: 7px; }
    .intro { display: grid; grid-template-columns: 1fr 78px; gap: 18px; align-items: start; margin: 15mm 0 9mm; }
    .name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    .meta { font-size: 12px; line-height: 1.8; }
    .overall { width: 74px; height: 74px; border-radius: 50%; border: 7px solid #16b3a8; display: grid; place-items: center; font-size: 30px; font-weight: 700; color: #333; }
    .subtitle { color: #5c2d91; font-size: 18px; font-weight: 700; margin: 7mm 0 5mm; }
    .skills-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8mm; }
    .skill-card { border: 1px solid #dedede; min-height: 58px; padding: 8px; text-align: center; }
    .skill-card strong { display: block; font-size: 23px; color: #333; }
    .skill-card span { color: #5c2d91; font-size: 12px; font-weight: 700; }
    .breakdown { border-top: 1px solid #d8d8d8; padding-top: 5mm; }
    .skill-row { display: grid; grid-template-columns: 82px 1fr 34px; gap: 10px; align-items: center; margin: 9px 0; font-size: 12px; }
    .skill-track { height: 8px; background: #e8e8e8; position: relative; }
    .skill-track span { background: #16b3a8; display: block; height: 8px; }
    .skill-score { font-weight: 700; text-align: right; }
    .overall-line { display: flex; justify-content: flex-end; align-items: baseline; gap: 8px; color: #5c2d91; font-weight: 700; margin: 5mm 0 8mm; }
    .overall-line strong { color: #333; font-size: 26px; }
    .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; border-top: 1px solid #d8d8d8; padding-top: 7mm; }
    .info h2 { color: #5c2d91; font-size: 16px; margin: 0 0 4mm; }
    .info-row { display: grid; grid-template-columns: 42mm 1fr; gap: 5px; font-size: 11.5px; line-height: 1.55; margin-bottom: 4px; }
    .label { font-weight: 700; }
    .footer { color: #666; font-size: 9px; margin-top: 11mm; border-top: 1px solid #e0e0e0; padding-top: 4mm; }
  </style>
</head>
<body>
  <main class="page">
    <section class="top-band">
      <div class="title">${escapeHtml(test.title || "PTE Academic")} | Score Report</div>
      <div class="code"><strong>Score Report Code:</strong> ${escapeHtml(reportCode)}</div>
    </section>

    <section class="intro">
      <div>
        <div class="name">${escapeHtml(fullName)}</div>
        <div class="meta"><strong>Test Taker ID:</strong> ${escapeHtml(user.pteId || "")}</div>
        <div class="meta"><strong>Registration ID:</strong> ${escapeHtml(registrationId)}</div>
        <div class="meta">${escapeHtml(displayName)}${registrationId ? " - " + escapeHtml(registrationId) : ""}</div>
      </div>
      <div class="overall">${escapeHtml(overall)}</div>
    </section>

    <div class="subtitle">Communicative Skills</div>
    <section class="skills-grid">
      ${Object.entries(scores).map(([name, value]) => `<div class="skill-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(name)}</span></div>`).join("")}
    </section>

    <section class="breakdown">
      <div class="subtitle">Skills Breakdown</div>
      ${skillRows}
      <div class="overall-line"><strong>${escapeHtml(overall)}</strong><span>Overall</span></div>
    </section>

    <section class="info">
      <div>
        <h2>Candidate Information</h2>
        <div class="info-row"><div class="label">Date of Birth:</div><div>${escapeHtml(formatPdfDate(user.dateOfBirth))}</div></div>
        <div class="info-row"><div class="label">Gender:</div><div>${escapeHtml(formatGender(user.gender))}</div></div>
        <div class="info-row"><div class="label">Country of Citizenship:</div><div>${escapeHtml(user.countryOfCitizenship || "")}</div></div>
        <div class="info-row"><div class="label">Country of Residence:</div><div>${escapeHtml(user.countryOfResidence || "")}</div></div>
      </div>
      <div>
        <h2>Test Centre Information</h2>
        <div class="info-row"><div class="label">Test Centre Country:</div><div>${escapeHtml(testCenterCountry)}</div></div>
        <div class="info-row"><div class="label">Test Centre ID:</div><div>${escapeHtml(report.testCenterId || metadata.testCenterId || "")}</div></div>
        <div class="info-row"><div class="label">Test Centre:</div><div>${escapeHtml(testCenterName)}</div></div>
        <div class="info-row"><div class="label">Test Date:</div><div>${escapeHtml(formatPdfDate(test.testDate))}</div></div>
        <div class="info-row"><div class="label">Valid Until:</div><div>${escapeHtml(formatPdfDate(validUntil))}</div></div>
      </div>
    </section>
    <div class="footer">Pearson Test of English score report generated from myPTE.</div>
  </main>
</body>
</html>`;
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
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" DROP CONSTRAINT IF EXISTS "TestScoreReport_testId_fkey"`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "Test" ALTER COLUMN "id" DROP DEFAULT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" ALTER COLUMN "id" DROP DEFAULT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "Test" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" ALTER COLUMN "id" TYPE TEXT USING "id"::TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" ALTER COLUMN "testId" TYPE TEXT USING "testId"::TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TestScoreReport"
    ADD CONSTRAINT "TestScoreReport_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE
  `).catch(() => {});
  await migrateLegacyNumericTestIds();
}

async function migrateLegacyNumericTestIds() {
  const tests = await prisma.$queryRawUnsafe(`
    SELECT "id" FROM "Test" WHERE "id" ~ '^[0-9]+$'
  `).catch(() => []);
  const reports = await prisma.$queryRawUnsafe(`
    SELECT "id" FROM "TestScoreReport" WHERE "id" ~ '^[0-9]+$'
  `).catch(() => []);

  if (!tests.length && !reports.length) {
    return;
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" DROP CONSTRAINT IF EXISTS "TestScoreReport_testId_fkey"`).catch(() => {});

  for (const test of tests) {
    const nextId = randomHexId();
    await prisma.$executeRawUnsafe(`UPDATE "Test" SET "id" = $1 WHERE "id" = $2`, nextId, test.id);
    await prisma.$executeRawUnsafe(`UPDATE "TestScoreReport" SET "testId" = $1 WHERE "testId" = $2`, nextId, test.id);
  }

  for (const report of reports) {
    await prisma.$executeRawUnsafe(`UPDATE "TestScoreReport" SET "id" = $1 WHERE "id" = $2`, randomHexId(), report.id);
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TestScoreReport"
    ADD CONSTRAINT "TestScoreReport_testId_fkey"
    FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE
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

async function downloadUserTestPdf(req, res, id) {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }

  const test = await prisma.test.findFirst({
    where: { id, userId: user.id },
    include: { user: true, scoreReport: true },
  });

  if (!test) {
    sendJson(res, 404, { error: "Test not found." });
    return;
  }

  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({
    executablePath: chromiumExecutablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(scoreReportPdfHtml(test), { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${pdfFilename(test)}"`,
      "Content-Length": pdf.length,
      "Content-Type": "application/pdf",
    });
    res.end(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = {
  listUserTests,
  createUserTest,
  listAllTests,
  createAdminTest,
  updateAdminTest,
  deleteAdminTest,
  getUserTest,
  downloadUserTestPdf,
  ensureScoreReportStore,
};
