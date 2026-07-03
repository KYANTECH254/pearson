const nodemailer = require("nodemailer");

function mailConfig() {
  const host = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.BREVO_SMTP_USER || process.env.BREVO_SMTP_LOGIN;
  const pass = process.env.SMTP_PASS || process.env.BREVO_SMTP_PASS || process.env.BREVO_SMTP_KEY;
  const fromEmail = process.env.SMTP_FROM || process.env.BREVO_FROM_EMAIL || process.env.MAIL_FROM || user;
  const fromName = process.env.SMTP_FROM_NAME || process.env.BREVO_FROM_NAME || "Pearson PTE";

  return {
    host,
    port,
    user,
    pass,
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
    secure: String(process.env.SMTP_SECURE || process.env.BREVO_SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
  };
}

function isEmailConfigured() {
  const config = mailConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function createTransporter() {
  const config = mailConfig();

  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

async function sendWelcomeEmail(user) {
  const transporter = createTransporter();

  if (!transporter || String(process.env.EMAIL_ENABLED || "true").toLowerCase() === "false") {
    return false;
  }

  const firstName = user.firstName || "there";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const loginUrl = process.env.AUTH_LOGIN_URL || `${process.env.PUBLIC_BASE_URL || "http://localhost:3000"}/login`;

  await transporter.sendMail({
    from: mailConfig().from,
    to: user.email,
    subject: "Your Pearson PTE account is ready",
    text: [
      `Hi ${firstName},`,
      "",
      "Your Pearson PTE account has been created.",
      `Name: ${fullName}`,
      `Username: ${user.username || user.email}`,
      "",
      `Sign in: ${loginUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#1f1f1f;line-height:1.5">
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>Your Pearson PTE account has been created.</p>
        <p><strong>Name:</strong> ${escapeHtml(fullName)}<br>
        <strong>Username:</strong> ${escapeHtml(user.username || user.email)}</p>
        <p><a href="${escapeHtml(loginUrl)}">Sign in to myPTE</a></p>
      </div>
    `,
  });

  return true;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  isEmailConfigured,
  sendWelcomeEmail,
};
