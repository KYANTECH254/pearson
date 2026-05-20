const prisma = require("../lib/prisma");
const { parseJsonBody, sendJson } = require("../lib/http");
const { hashPassword } = require("../lib/password");
const { assignPteId } = require("../lib/pteId");
const { optionalProfileData } = require("../lib/userProfile");
const { currentUser, publicUser } = require("./authController");

async function requireAdmin(req, res) {
  const user = await currentUser(req);

  if (!user) {
    sendJson(res, 401, { error: "Please log in." });
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

module.exports = {
  createUser,
  listUsers,
};
