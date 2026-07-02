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
  const paths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  return paths.find((file) => file && fs.existsSync(file));
}

function pdfFilename(test) {
  const user = test.user || {};
  const report = test.scoreReport || {};
  const name = [user.firstName, user.lastName].filter(Boolean).join("_") || user.username || "score-report";
  const registrationId = report.registrationId || test.id;

  return `${name}_${registrationId}.pdf`.replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_");
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
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const pteId = user.pteId || "";
  const registrationId = report.registrationId || metadata.registrationId || "";
  const reportCode = report.reportCode || metadata.reportCode || "";
  const testDate = test.testDate || metadata.testDate;
  const validUntil = report.validUntil || metadata.validUntil || addYears(testDate, 2);
  const testCenterName = report.testCenterName || metadata.testCenterName || "Navitas English Test Centre- Brisbane";
  const testCenterId = report.testCenterId || metadata.testCenterId || "58064";
  const testCenterCountry = report.testCenterCountry || metadata.testCenterCountry || "Australia";

  const listening = Number(scoreValue(test, report, "listeningScore")) || 0;
  const reading = Number(scoreValue(test, report, "readingScore")) || 0;
  const speaking = Number(scoreValue(test, report, "speakingScore")) || 0;
  const writing = Number(scoreValue(test, report, "writingScore")) || 0;
  const overall = Number(scoreValue(test, report, "overallScore")) || 48;
  const birthDate = user.dateOfBirth || (
    user.birthYear && user.birthMonth && user.birthDay
      ? new Date(Date.UTC(user.birthYear, user.birthMonth - 1, user.birthDay))
      : null
  );
  const skillBar = (label, value, color) => `
            <div class="bar-row">
              <div class="bar-label">${escapeHtml(label)}</div>
              <div class="bar-score">${value}</div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: ${(value / 90) * 100}%; background-color: ${color};"></div>
              </div>
            </div>`;

  let avatarUrl = user.avatarUrl || "https://mypte.pearsonpte.com/assets/no-image.png";
  if (avatarUrl.startsWith("/")) {
    avatarUrl = "https://mypte.pearsonpte.com" + avatarUrl;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(test.title || "PTE Academic")}™ Score Report - title</title>
  <style>
    :root {
      --teal: #18b7ad;
      --purple: #9a007d;
      --dark-blue: #20394b;
      --grey: #f4f4f4;
      --border: #dcdcdc;
      --chart-line: #5b7f95;
    }
    @page { size: 150mm 210mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      background: white;
      -webkit-print-color-adjust: exact;
    }
    .page {
      width: 150mm;
      height: 210mm;
      position: relative;
      overflow: hidden;
    }
    .header {
      background-color: var(--teal);
      color: #000;
      height: 68px;
      padding: 8px 20px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-mark {
      align-items: center;
      background: #1d86b7;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-size: 30px;
      font-weight: bold;
      height: 38px;
      justify-content: center;
      line-height: 1;
      width: 38px;
    }
    .brand {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      font-weight: 400;
      letter-spacing: -1px;
      white-space: nowrap;
    }
    .report-title {
      border-left: 2px solid #111;
      font-size: 16px;
      line-height: 20px;
      margin-left: 1px;
      padding-left: 5px;
      white-space: nowrap;
    }
    .report-code-bar {
      background-color: var(--teal);
      color: #000;
      font-size: 9px;
      height: 28px;
      padding-left: 72px;
      padding-top: 4px;
    }
    .main-content {
      padding: 16px 22px 0;
    }
    .top-section {
      display: flex;
      margin-bottom: 14px;
      align-items: flex-start;
      position: relative;
    }
    .candidate-brief {
      display: flex;
      gap: 20px;
      width: 270px;
    }
    .avatar {
      width: 68px;
      height: 68px;
      background-color: #eee;
      object-fit: cover;
    }
    .candidate-info-top h1 {
      margin: 1px 0 10px 0;
      font-size: 16px;
      color: #333;
      font-weight: 400;
      line-height: 19px;
    }
    .candidate-info-top p {
      margin: 3px 0;
      font-size: 9px;
      color: #000;
      line-height: 10px;
    }
    .score-divider {
      background: #d3d3d3;
      height: 86px;
      margin-left: auto;
      width: 1px;
    }
    .overall-score-box {
      background-color: var(--purple);
      color: white;
      width: 62px;
      height: 62px;
      border-radius: 7px 7px 22px 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-left: 25px;
      margin-top: 1px;
    }
    .overall-score-box .label {
      font-size: 8px;
      text-transform: uppercase;
      font-weight: bold;
      line-height: 10px;
      margin-bottom: 1px;
    }
    .overall-score-box .value {
      font-size: 34px;
      font-weight: bold;
      line-height: 1;
    }
    .section-title {
      font-size: 15px;
      font-weight: bold;
      color: #333;
      border-bottom: 1px solid var(--border);
      padding-bottom: 5px;
      margin: 0 0 10px 0;
    }
    .communicative-skills {
      display: flex;
      justify-content: center;
      gap: 26px;
      margin: 8px 0 15px 0;
    }
    .skill-circle {
      text-align: center;
      width: 60px;
    }
    .circle {
      width: 49px;
      height: 49px;
      border-radius: 50%;
      border: 3px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      margin: 0 auto 7px auto;
    }
    .skill-label {
      font-size: 10px;
      color: #222;
      font-weight: 400;
    }
    .listening .circle { border-color: var(--dark-blue); color: var(--dark-blue); }
    .reading .circle { border-color: #c4d600; color: #c4d600; }
    .speaking .circle { border-color: #555; color: #555; }
    .writing .circle { border-color: #a3007e; color: #a3007e; }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 0.68fr;
      gap: 26px;
    }
    .chart-container {
      position: relative;
      margin-top: 8px;
      padding-top: 20px;
      width: 205px;
    }
    .bar-row {
      display: flex;
      align-items: center;
      height: 18px;
      margin-bottom: 1px;
      font-size: 7px;
    }
    .bar-label {
      width: 44px;
      text-align: right;
      margin-right: 5px;
      color: #666;
      font-weight: 400;
    }
    .bar-score {
      color: #000;
      font-size: 8px;
      margin-right: 9px;
      width: 14px;
    }
    .bar-bg {
      height: 15px;
      position: relative;
      width: 122px;
    }
    .bar-fill {
      height: 100%;
    }
    .vertical-line {
      position: absolute;
      left: 146px;
      top: 16px;
      width: 2px;
      height: 75px;
      background-color: var(--chart-line);
      z-index: 10;
    }
    .chart-header {
      position: absolute;
      top: 1px;
      left: 112px;
      font-size: 8px;
      color: var(--chart-line);
      font-weight: bold;
      white-space: nowrap;
    }
    .info-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .info-list li {
      margin-bottom: 8px;
      font-size: 8.5px;
      display: flex;
      line-height: 10px;
    }
    .info-list li strong {
      display: inline-block;
      width: auto;
      color: #333;
      flex-shrink: 0;
      font-weight: 700;
      margin-right: 5px;
    }
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 32px;
      background-color: var(--teal);
    }
    .side-text {
      position: absolute;
      right: -83px;
      top: 16px;
      transform: rotate(90deg);
      transform-origin: left center;
      font-size: 8px;
      color: #111;
      white-space: nowrap;
    }
    .test-centre {
      margin-top: 27px;
    }
    .test-centre .details-grid {
      grid-template-columns: 1fr 0.7fr;
      gap: 40px;
    }
    .test-centre .info-list li {
      margin-bottom: 7px;
    }
    .test-centre .info-list li strong {
      min-width: 78px;
    }
    .candidate-information .info-list li strong {
      min-width: 88px;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-mark">?</div>
      <div class="brand">Pearson</div>
      <div class="report-title">${escapeHtml(test.title || "PTE Academic")} | Score Report</div>
    </div>
    <div class="report-code-bar">
      <strong>Score Report Code:</strong>&nbsp;&nbsp; ${escapeHtml(reportCode)}
    </div>
    <div class="main-content">
      <div class="top-section">
        <div class="candidate-brief">
          <img class="avatar" src="${escapeHtml(avatarUrl)}" alt="">
          <div class="candidate-info-top">
            <h1>${escapeHtml(fullName)}</h1>
            <p><strong>Test Taker ID:</strong>&nbsp; ${escapeHtml(pteId)}</p>
            <p><strong>Registration ID:</strong>&nbsp; ${escapeHtml(registrationId)}</p>
          </div>
        </div>
        <div class="score-divider"></div>
        <div class="overall-score-box">
          <div class="label">Overall Score</div>
          <div class="value">${overall}</div>
        </div>
        <div class="side-text">
          ${escapeHtml(displayName)} - ${escapeHtml(registrationId)}
        </div>
      </div>

      <div class="section-title">Communicative Skills</div>
      <div class="communicative-skills">
        <div class="skill-circle listening">
          <div class="circle">${listening}</div>
          <div class="skill-label">Listening</div>
        </div>
        <div class="skill-circle reading">
          <div class="circle">${reading}</div>
          <div class="skill-label">Reading</div>
        </div>
        <div class="skill-circle speaking">
          <div class="circle">${speaking}</div>
          <div class="skill-label">Speaking</div>
        </div>
        <div class="skill-circle writing">
          <div class="circle">${writing}</div>
          <div class="skill-label">Writing</div>
        </div>
      </div>

      <div class="details-grid">
        <div>
          <div class="section-title">Skills Breakdown</div>
          <div class="chart-container">
            <div class="chart-header">Overall&nbsp; ${overall}</div>
            <div class="vertical-line"></div>
${skillBar("Listening", listening, "var(--dark-blue)")}
${skillBar("Reading", reading, "#c4d600")}
${skillBar("Speaking", speaking, "#555")}
${skillBar("Writing", writing, "#a3007e")}
          </div>
        </div>
        <div class="candidate-information">
          <div class="section-title">Candidate Information</div>
          <ul class="info-list">
            <li><strong>Date of Birth:</strong> ${escapeHtml(formatPdfDate(birthDate))}</li>
            <li><strong>Gender:</strong> ${escapeHtml(formatGender(user.gender))}</li>
            <li><strong>Country of Citizenship:</strong> ${escapeHtml(user.countryOfCitizenship || "")}</li>
            <li><strong>Country of Residence:</strong> ${escapeHtml(user.countryOfResidence || "")}</li>
          </ul>
        </div>
      </div>

      <div class="test-centre">
        <div class="section-title">Test Centre Information</div>
        <div class="details-grid">
          <ul class="info-list">
            <li><strong>Test Centre Country:</strong> ${escapeHtml(testCenterCountry)}</li>
            <li><strong>Test Centre ID:</strong> ${escapeHtml(testCenterId)}</li>
            <li><strong>Test Centre:</strong> ${escapeHtml(testCenterName)}</li>
          </ul>
          <ul class="info-list">
            <li><strong>Test Date:</strong> ${escapeHtml(formatPdfDate(testDate))}</li>
            <li><strong>Valid Until:</strong> ${escapeHtml(formatPdfDate(validUntil))}</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer"></div>
  </div>
</body>
</html>
  `;
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
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" ADD COLUMN IF NOT EXISTS "testTime" TEXT`).catch(() => {});
  await prisma.$executeRawUnsafe(`ALTER TABLE "TestScoreReport" ADD COLUMN IF NOT EXISTS "testCenterId" TEXT`).catch(() => {});
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

  // Scoping logic:
  // 1. If user is ADMIN and an ID is provided, fetch that specific test.
  // 2. If user is ADMIN and no ID (latest), fetch THEIR latest test.
  // 3. If user is NOT ADMIN, ALWAYS filter by THEIR userId.

  const where = {};

  if (user.role === "ADMIN") {
    if (!isLatest) {
      where.id = id;
    } else {
      where.userId = user.id; // Admin's own latest
    }
  } else {
    // Regular user: must be their own
    where.userId = user.id;
    if (!isLatest) {
      where.id = id;
    }
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

  const isLatest = !id || id === "latest";
  const where = {};

  if (user.role === "ADMIN") {
    if (!isLatest) {
      where.id = id;
    } else {
      where.userId = user.id;
    }
  } else {
    where.userId = user.id;
    if (!isLatest) {
      where.id = id;
    }
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

  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: chromiumExecutablePath(),
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(scoreReportPdfHtml(test), { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${pdfFilename(test)}"`,
      "Content-Length": pdf.length,
      "Content-Type": "application/pdf",
    });
    res.end(pdf);
  } catch (error) {
    console.error("PDF Generation error:", error);
    sendJson(res, 500, { error: "Failed to generate PDF." });
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
