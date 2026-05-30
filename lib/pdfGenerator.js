const puppeteer = require("puppeteer");

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function generateScoreReportPdf(data) {
  const { test, user } = data;
  const report = test.scoreReport || {};
  const metadata = Object.assign({}, test.metadata || {}, report.metadata || {});

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const pteId = user.pteId || "";
  const registrationId = report.registrationId || metadata.registrationId || "";
  const reportCode = report.reportCode || metadata.reportCode || "";
  const testDate = test.testDate || metadata.testDate;
  const validUntil = report.validUntil || metadata.validUntil;
  const title = test.title || "PTE Academic";
  const overall = report.overallScore == null ? test.score : report.overallScore;

  const listening = report.listeningScore || 0;
  const reading = report.readingScore || 0;
  const speaking = report.speakingScore || 0;
  const writing = report.writingScore || 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --teal: #00a19c;
      --purple: #741d7d;
      --dark-blue: #232f3e;
      --grey: #f4f4f4;
      --border: #dcdcdc;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
    }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background: white;
    }
    .header {
      background-color: var(--teal);
      color: white;
      padding: 10px 40px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .header img {
      height: 40px;
    }
    .header .report-title {
      font-size: 24px;
      font-weight: normal;
    }
    .report-code-bar {
      background-color: var(--grey);
      padding: 5px 40px;
      font-size: 12px;
      color: #555;
    }
    .main-content {
      padding: 30px 40px;
    }
    .top-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .candidate-brief {
      display: flex;
      gap: 20px;
    }
    .avatar {
      width: 100px;
      height: 120px;
      background-color: #ddd;
      object-fit: cover;
      border: 1px solid var(--border);
    }
    .candidate-info-top h1 {
      margin: 0;
      font-size: 24px;
      color: #333;
    }
    .candidate-info-top p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .overall-score-box {
      background-color: var(--purple);
      color: white;
      width: 100px;
      height: 100px;
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .overall-score-box .label {
      font-size: 10px;
      text-transform: uppercase;
    }
    .overall-score-box .value {
      font-size: 48px;
      font-weight: bold;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      border-bottom: 1px solid var(--border);
      padding-bottom: 5px;
      margin: 20px 0 15px 0;
    }
    .communicative-skills {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
    }
    .skill-circle {
      text-align: center;
    }
    .circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      border: 3px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: bold;
      margin: 0 auto 5px auto;
    }
    .skill-label {
      font-size: 12px;
      color: #666;
    }
    .listening .circle { border-color: #232f3e; color: #232f3e; }
    .reading .circle { border-color: #c4d600; color: #c4d600; }
    .speaking .circle { border-color: #555; color: #555; }
    .writing .circle { border-color: #a3007e; color: #a3007e; }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .chart-container {
      position: relative;
      margin-top: 10px;
    }
    .bar-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .bar-label {
      width: 70px;
      text-align: right;
      margin-right: 10px;
      color: #666;
    }
    .bar-bg {
      flex-grow: 1;
      height: 18px;
      background-color: transparent;
      position: relative;
    }
    .bar-fill {
      height: 100%;
    }
    .vertical-line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: #5b7f95;
      z-index: 5;
    }
    .chart-header {
      display: flex;
      justify-content: flex-end;
      font-size: 10px;
      margin-bottom: 5px;
      color: #5b7f95;
    }
    .info-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .info-list li {
      margin-bottom: 10px;
      font-size: 12px;
    }
    .info-list li strong {
      display: inline-block;
      width: 140px;
      color: #333;
    }
    .footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 25px;
      background-color: var(--teal);
    }
    .side-text {
      position: absolute;
      right: 10px;
      top: 120px;
      transform: rotate(90deg);
      transform-origin: right top;
      font-size: 12px;
      color: #999;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="https://mypte.pearsonpte.com/assets/images/PEARSON_LOGO_WHITE_RGB.svg" alt="Pearson">
      <div class="report-title">| ${title} | Score Report</div>
    </div>
    <div class="report-code-bar">
      Score Report Code: ${reportCode}
    </div>
    <div class="main-content">
      <div class="top-section">
        <div class="candidate-brief">
          <img class="avatar" src="${user.avatarUrl || "https://mypte.pearsonpte.com/assets/no-image.png"}" alt="">
          <div class="candidate-info-top">
            <h1>${fullName}</h1>
            <p><strong>Test Taker ID:</strong> ${pteId}</p>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
          </div>
        </div>
        <div class="overall-score-box">
          <div class="label">Overall Score</div>
          <div class="value">${overall}</div>
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
            <div class="chart-header">Overall ${overall}</div>
            <div class="bar-row">
              <div class="bar-label">Listening ${listening}</div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: ${(listening / 90) * 100}%; background-color: #232f3e;"></div>
                <div class="vertical-line" style="left: ${(overall / 90) * 100}%;"></div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Reading ${reading}</div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: ${(reading / 90) * 100}%; background-color: #c4d600;"></div>
                <div class="vertical-line" style="left: ${(overall / 90) * 100}%;"></div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Speaking ${speaking}</div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: ${(speaking / 90) * 100}%; background-color: #555;"></div>
                <div class="vertical-line" style="left: ${(overall / 90) * 100}%;"></div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Writing ${writing}</div>
              <div class="bar-bg">
                <div class="bar-fill" style="width: ${(writing / 90) * 100}%; background-color: #a3007e;"></div>
                <div class="vertical-line" style="left: ${(overall / 90) * 100}%;"></div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="section-title">Candidate Information</div>
          <ul class="info-list">
            <li><strong>Date of Birth:</strong> ${formatDate(user.dateOfBirth || new Date(user.birthYear, user.birthMonth-1, user.birthDay))}</li>
            <li><strong>Gender:</strong> ${user.gender || ""}</li>
            <li><strong>Country of Citizenship:</strong> ${user.countryOfCitizenship || ""}</li>
            <li><strong>Country of Residence:</strong> ${user.countryOfResidence || ""}</li>
          </ul>
        </div>
      </div>

      <div class="section-title">Test Centre Information</div>
      <div class="details-grid">
        <ul class="info-list">
          <li><strong>Test Centre Country:</strong> ${report.testCenterCountry || metadata.testCenterCountry || ""}</li>
          <li><strong>Test Centre ID:</strong> ${report.testCenterId || metadata.testCenterId || ""}</li>
          <li><strong>Test Centre:</strong> ${report.testCenterName || metadata.testCenterName || ""}</li>
        </ul>
        <ul class="info-list">
          <li><strong>Test Date:</strong> ${formatDate(testDate)}</li>
          <li><strong>Valid Until:</strong> ${formatDate(validUntil)}</li>
        </ul>
      </div>
    </div>
    <div class="side-text">
      ${lastName} ${firstName} - ${registrationId}
    </div>
    <div class="footer"></div>
  </div>
</body>
</html>
  `;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  return pdf;
}

module.exports = {
  generateScoreReportPdf,
};
