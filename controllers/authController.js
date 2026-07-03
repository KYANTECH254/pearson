const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { parseCookies, parseJsonBody, sendJson } = require("../lib/http");
const { hashPassword, verifyPassword } = require("../lib/password");
const { assignPteId } = require("../lib/pteId");
const { optionalProfileData } = require("../lib/userProfile");
const { sendWelcomeEmail } = require("../lib/email");

const sessionCookie = "pearson_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN || ".mypte.pearsonpte.com";
const sessionCookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${sessionCookieDomain ? `; Domain=${sessionCookieDomain}` : ""}`;
const sessionSecret = process.env.SESSION_SECRET || process.env.AUTH_SECRET || process.env.DATABASE_URL || "pearson-dashboard-local-session-secret";

function sessionCookieHeader(token) {
  return `${sessionCookie}=${encodeURIComponent(token)}; ${sessionCookieOptions}`;
}

function hostSessionCookieHeader(token) {
  return `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`;
}

function clearSessionCookieHeader() {
  return `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${sessionCookieDomain ? `; Domain=${sessionCookieDomain}` : ""}`;
}

function clearSessionCookieHeaders() {
  const headers = [
    `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  ];

  if (sessionCookieDomain) {
    headers.push(clearSessionCookieHeader());
  }

  return headers;
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signSessionPayload(payload) {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createSessionToken(user) {
  const payload = base64UrlEncode({
    userId: user.id,
    issuedAt: Date.now(),
    expiresAt: Date.now() + sessionMaxAgeSeconds * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  });
  const signature = signSessionPayload(payload);

  return `v1.${payload}.${signature}`;
}

async function ensureSessionStore() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuthSession" (
      "id" SERIAL PRIMARY KEY,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession"("userId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt")
  `);
}

function getSignedSession(token) {
  const parts = String(token || "").split(".");

  if (parts.length !== 3 || parts[0] !== "v1") {
    return null;
  }

  const expectedSignature = signSessionPayload(parts[1]);
  const signature = Buffer.from(parts[2]);
  const expected = Buffer.from(expectedSignature);

  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const session = base64UrlDecode(parts[1]);

    if (!session.userId || !session.expiresAt || session.expiresAt <= Date.now()) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  const fullProfileFields = [
    "firstName",
    "lastName",
    "email",
    "countryOfResidence",
    "dateOfBirth",
    "birthDay",
    "birthMonth",
    "birthYear",
    "gender",
    "countryOfBirth",
    "countryOfCitizenship",
    "streetAddress",
    "city",
    "phoneCountryCode",
    "primaryPhone",
  ];
  const hasFullProfile = fullProfileFields.every((field) => {
    const value = safeUser[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });

  return {
    ...safeUser,
    displayId: safeUser.pteId || "",
    hasFullProfile,
    person: {
      email: safeUser.email,
      firstName: safeUser.firstName,
      lastName: safeUser.lastName,
      givenNames: safeUser.firstName,
      surname: safeUser.lastName,
    },
  };
}

async function ensureDefaultAdmin() {
  const count = await prisma.user.count();

  if (count > 0) {
    await ensureSeedLogins();
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@example.com",
      username: process.env.ADMIN_USERNAME || "admin",
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD || "Admin123!"),
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });

  await assignPteId(prisma, user);
  await ensureSeedLogins();
}

async function ensureSeedLogins() {
  const { seedProducts } = require("./productController");
  const { createUserTest } = require("./testController");

  const kyan = await ensureSeedUser({
    email: "kyan@example.com",
    username: "kyan",
    password: "123456",
    firstName: "Kyan",
    lastName: "User",
    role: "USER",
  });
  await seedProducts();

  // Seed a test if none exists for kyan
  const testCount = await prisma.test.count({ where: { userId: kyan.id } });
  if (testCount === 0) {
    await prisma.test.create({
      data: {
        id: crypto.randomBytes(12).toString("hex"),
        userId: kyan.id,
        title: "PTE Academic",
        score: 48,
        status: "Completed",
        testDate: new Date(),
        scoreReport: {
          create: {
            id: crypto.randomBytes(12).toString("hex"),
            reportCode: "05932dRSM3",
            registrationId: "534649035",
            overallScore: 48,
            listeningScore: 52,
            readingScore: 34,
            speakingScore: 63,
            writingScore: 29,
            testCenterName: "Navitas English Test Centre- Brisbane",
            testCenterCountry: "Australia",
            testCenterId: "58064",
            validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2),
            metadata: { conversationId: "2263277" },
          }
        }
      }
    });
  }
}

async function ensureSeedUser(seed) {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: seed.username }, { email: seed.email }],
    },
  });
  const data = {
    email: seed.email,
    username: seed.username,
    passwordHash: await hashPassword(seed.password),
    firstName: seed.firstName,
    lastName: seed.lastName,
    role: seed.role,
    isActive: true,
  };

  const user = existingUser
    ? await prisma.user.update({ where: { id: existingUser.id }, data })
    : await prisma.user.create({ data });

  await assignPteId(prisma, user);
  return user;
}

async function setSession(user) {
  const token = createSessionToken(user);
  const session = getSignedSession(token);

  await prisma.authSession.create({
    data: {
      tokenHash: tokenHash(token),
      userId: user.id,
      expiresAt: new Date(session.expiresAt),
    },
  });

  return token;
}

async function currentUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  let token = bearerToken;

  if (!token && req.url) {
    try {
      const url = new URL(req.url, "http://localhost");
      token = url.searchParams.get("token") || "";
    } catch (e) {}
  }

  return userFromSessionToken(token);
}

async function userFromSessionToken(token) {
  const signedSession = token ? getSignedSession(token) : null;

  if (!signedSession) {
    return null;
  }

  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash: tokenHash(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!session || Number(session.userId) !== Number(signedSession.userId)) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user || !user.isActive) {
    await revokeSession(token);
    return null;
  }

  return user;
}

async function login(req, res) {
  const body = await parseJsonBody(req);
  const username = String(body.username || body.email || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    sendJson(res, 400, { error: "Username and password are required." });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email: username }],
      isActive: true,
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    sendJson(res, 401, { error: "Invalid username or password." });
    return;
  }

  const token = await setSession(user);
  // Return token and user only. Do not set a session cookie so clients can
  // persist the token in localStorage and use Authorization: Bearer <token>.
  sendJson(res, 200, { token, user: publicUser(user) });
}

async function register(req, res) {
  const body = await parseJsonBody(req);
  const email = String(body.email || body.username || "").trim().toLowerCase();
  const username = String(body.username || body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const firstName = String(body.firstName || body.givenNames || "").trim();
  const lastName = String(body.lastName || body.surname || "").trim();

  if (!email || !username || !password) {
    sendJson(res, 400, { error: "Email/username and password are required." });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(res, 400, { error: "Please enter a valid email address." });
    return;
  }

  if (password.length < 8) {
    sendJson(res, 400, { error: "Password must be at least 8 characters." });
    return;
  }

  try {
    let user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hashPassword(password),
        firstName: firstName || email.split("@")[0],
        lastName: lastName || "User",
        role: "USER",
        ...optionalProfileData(body),
      },
    });
    user = await assignPteId(prisma, user);
    const token = await setSession(user);

    sendWelcomeEmail(user).catch((error) => {
      console.warn("Unable to send registration email:", error.message);
    });

    // Return token and user without setting a cookie.
    sendJson(res, 201, { token, user: publicUser(user) });
  } catch (error) {
    if (error.code === "P2002") {
      sendJson(res, 409, { error: "Email or username already exists." });
      return;
    }

    throw error;
  }
}

async function me(req, res) {
  const user = await currentUser(req);

  if (!user) {
    sendJson(res, 401, { user: null });
    return;
  }

  sendJson(res, 200, { user: publicUser(user) });
}

async function logout(req, res) {
  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = bearerToken;

  if (token) {
    await revokeSession(token);
  }

  sendJson(res, 200, { ok: true });
}

async function revokeSession(token) {
  await prisma.authSession.updateMany({
    where: { tokenHash: tokenHash(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  currentUser,
  ensureDefaultAdmin,
  ensureSessionStore,
  login,
  logout,
  me,
  publicUser,
  register,
  clearSessionCookieHeaders,
  hostSessionCookieHeader,
  sessionCookieHeader,
  userFromSessionToken,
};
