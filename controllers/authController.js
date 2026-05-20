const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { parseCookies, parseJsonBody, sendJson } = require("../lib/http");
const { hashPassword, verifyPassword } = require("../lib/password");
const { assignPteId } = require("../lib/pteId");
const { optionalProfileData } = require("../lib/userProfile");

const sessions = new Map();
const sessionCookie = "pearson_session";
const sessionCookieOptions = "Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000";

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
  await ensureSeedUser({
    email: "kyan@example.com",
    username: "kyan",
    password: "123456",
    firstName: "Kyan",
    lastName: "User",
    role: "USER",
  });
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

function setSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  return token;
}

async function currentUser(req) {
  const authHeader = String(req.headers.authorization || "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = bearerToken || parseCookies(req)[sessionCookie];
  const session = token ? sessions.get(token) : null;

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user || !user.isActive) {
    sessions.delete(token);
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

  const token = setSession(user);
  sendJson(res, 200, { token, user: publicUser(user) }, {
    "Set-Cookie": `${sessionCookie}=${encodeURIComponent(token)}; ${sessionCookieOptions}`,
  });
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
    const token = setSession(user);

    sendJson(res, 201, { token, user: publicUser(user) }, {
      "Set-Cookie": `${sessionCookie}=${encodeURIComponent(token)}; ${sessionCookieOptions}`,
    });
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
    sessions.delete(token);
  }

  sendJson(res, 200, { ok: true }, {
    "Set-Cookie": `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  });
}

module.exports = {
  currentUser,
  ensureDefaultAdmin,
  login,
  logout,
  me,
  publicUser,
  register,
};
