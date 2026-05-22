const prisma = require("../lib/prisma");
const { parseJsonBody, sendJson } = require("../lib/http");
const { hashPassword, verifyPassword } = require("../lib/password");
const { assignPteId } = require("../lib/pteId");
const { optionalProfileData } = require("../lib/userProfile");
const { currentUser, publicUser } = require("./authController");

async function requireUser(req, res) {
  const user = await currentUser(req);

  if (!user) {
    sendJson(res, 401, { error: "Please log in." });
    return null;
  }

  return user;
}

async function requireAdmin(req, res) {
  const user = await requireUser(req, res);

  if (!user) {
    return null;
  }

  if (user.role !== "ADMIN") {
    sendJson(res, 403, { error: "Admin access required." });
    return null;
  }

  return user;
}

async function listUsers(req, res) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  sendJson(res, 200, { users: users.map(publicUser) });
}

async function createUser(req, res) {
  if (!(await requireAdmin(req, res))) {
    return;
  }

  const body = await parseJsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const role = String(body.role || "USER").trim().toUpperCase() === "ADMIN" ? "ADMIN" : "USER";

  if (!email || !username || !password || !firstName || !lastName) {
    sendJson(res, 400, { error: "All user fields are required." });
    return;
  }

  try {
    let user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hashPassword(password),
        firstName,
        lastName,
        role,
        ...optionalProfileData(body),
      },
    });
    user = await assignPteId(prisma, user);

    sendJson(res, 201, { user: publicUser(user) });
  } catch (error) {
    if (error.code === "P2002") {
      sendJson(res, 409, { error: "Email or username already exists." });
      return;
    }

    throw error;
  }
}

async function updateProfile(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const body = await parseJsonBody(req);
  const data = optionalProfileData(body);

  if (body.firstName !== undefined) data.firstName = String(body.firstName || "").trim();
  if (body.lastName !== undefined) data.lastName = String(body.lastName || "").trim();
  if (body.email !== undefined) data.email = String(body.email || "").trim().toLowerCase();

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    sendJson(res, 200, { user: publicUser(updatedUser) });
  } catch (error) {
    if (error.code === "P2002") {
      sendJson(res, 409, { error: "Email already exists." });
      return;
    }
    throw error;
  }
}

async function updatePassword(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const body = await parseJsonBody(req);
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!currentPassword || !newPassword) {
    sendJson(res, 400, { error: "Current and new passwords are required." });
    return;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!(await verifyPassword(currentPassword, dbUser.passwordHash))) {
    sendJson(res, 401, { error: "Invalid current password." });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  });

  sendJson(res, 200, { ok: true });
}

async function updatePrivacy(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;

  const body = await parseJsonBody(req);
  const data = {};

  if (body.communicationConsent !== undefined) {
    data.communicationConsent = body.communicationConsent === true || body.communicationConsent === "true" || body.communicationConsent === "on";
  }
  if (body.researchConsent !== undefined) {
    data.researchConsent = body.researchConsent === true || body.researchConsent === "true" || body.researchConsent === "on";
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  sendJson(res, 200, { user: publicUser(updatedUser) });
}

module.exports = {
  createUser,
  listUsers,
  updateProfile,
  updatePassword,
  updatePrivacy,
};

