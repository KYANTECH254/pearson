const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { parseCookies, parseJsonBody, sendJson } = require("../lib/http");
const { hashPassword, verifyPassword } = require("../lib/password");
const { assignPteId } = require("../lib/pteId");
const { optionalProfileData } = require("../lib/userProfile");

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

  return {
    ...safeUser,
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

  await ensureSeedUser({
    email: "kyan@example.com",
    username: "kyan",
    password: "123456",
    firstName: "Kyan",
    lastName: "User",
    role: "USER",
  });
  await seedProducts();
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
  const token = bearerToken || parseCookies(req)[sessionCookie];

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
  const token = bearerToken || parseCookies(req)[sessionCookie];

  if (token) {
    await revokeSession(token);
  }

  sendJson(res, 200, { ok: true }, {
    "Set-Cookie": clearSessionCookieHeaders(),
  });
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
