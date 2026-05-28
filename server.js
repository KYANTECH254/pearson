const fs = require("fs");
const http = require("http");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);

    if (!match || process.env[match[1]]) {
      return;
    }

    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

loadEnv();

const { login, logout, me, register, ensureDefaultAdmin, ensureSessionStore, currentUser } = require("./controllers/authController");
const { createUser, listUsers, updateAdminUser, updateProfile, updatePassword, updatePrivacy } = require("./controllers/userController");
const { listUserTests, createUserTest, listAllTests, createAdminTest, updateAdminTest, getUserTest, ensureScoreReportStore } = require("./controllers/testController");
const { getProducts, createProduct, updateProduct, deleteProduct } = require("./controllers/productController");
const { databaseTarget, isDatabaseConnectionError } = require("./lib/databaseErrors");
const { sendJson } = require("./lib/http");

const publicDir = path.join(__dirname, "public");
const preferredPort = Number(process.env.PORT || 3000);
const scoreReportTemplate = "my-activity/test-score/69ee8736b59b9ff4b555f82e/index.html";
const routeAliases = new Map([
  ["/activity", "activity.html"],
  ["/my-activity", "my-activity.html"],
  ["/my-activity/test-score/69ee8736b59b9ff4b555f82e", scoreReportTemplate],
  ["/account", "account.html"],
  ["/admin", "admin.html"],
  ["/users/edit-user-account/collapse", "account.html"],
  ["/users/edit-user-account", "account.html"],
  ["/cart", "cart.html"],
  ["/learn", "learn.html"],
  ["/login", "login.html"],
  ["/logout", "login.html"],
  ["/users/profile/quick-registration", "register.html"],
  ["/myPTE", "index.html"],
  ["/mypte", "index.html"],
  ["/dashboard", "index.html"],
  ["/help", "index.html"],
]);
const dynamicRouteAliases = [
  {
    pattern: /^\/my-activity\/test-score\/[^/]+$/,
    resolve: (decodedPath) => {
      const specificReport = path.join(publicDir, decodedPath, "index.html");

      return fs.existsSync(specificReport) ? specificReport : path.join(publicDir, scoreReportTemplate);
    },
  },
];

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function resolveRequestPath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const decodedPath = decodeURIComponent(url.pathname);
  const aliasedFile = routeAliases.get(decodedPath);
  const dynamicAlias = dynamicRouteAliases.find((alias) => alias.pattern.test(decodedPath));

  if (aliasedFile) {
    return path.join(publicDir, aliasedFile);
  }

  if (dynamicAlias) {
    return dynamicAlias.resolve(decodedPath);
  }

  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(publicDir, normalizedPath);

  if (!filePath.startsWith(publicDir)) {
    return null;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlPath = `${filePath}.html`;
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(publicDir, "index.html");
  }

  return filePath;
}

async function handleApiRequest(req, res, pathname) {
  try {
    if (pathname === "/api/auth/login" && req.method === "POST") {
      await login(req, res);
      return true;
    }

    if (pathname === "/api/auth/register" && req.method === "POST") {
      await register(req, res);
      return true;
    }

    if (pathname === "/api/auth/me" && req.method === "GET") {
      await me(req, res);
      return true;
    }

    if (pathname === "/api/auth/logout" && req.method === "POST") {
      await logout(req, res);
      return true;
    }

    if (pathname === "/api/admin/users" && req.method === "GET") {
      await listUsers(req, res);
      return true;
    }

    if (pathname === "/api/admin/users" && req.method === "POST") {
      await createUser(req, res);
      return true;
    }

    if (pathname.startsWith("/api/admin/users/") && req.method === "PUT") {
      const id = pathname.split("/").pop();
      await updateAdminUser(req, res, id);
      return true;
    }

    if (pathname === "/api/admin/tests" && req.method === "GET") {
      await listAllTests(req, res);
      return true;
    }

    if (pathname === "/api/admin/tests" && req.method === "POST") {
      await createAdminTest(req, res);
      return true;
    }

    if (pathname.startsWith("/api/admin/tests/") && req.method === "PUT") {
      const id = pathname.split("/").pop();
      await updateAdminTest(req, res, id);
      return true;
    }

    if (pathname === "/api/user/tests" && req.method === "GET") {
      await listUserTests(req, res);
      return true;
    }

    if (pathname.startsWith("/api/user/tests/") && req.method === "GET") {
      const id = pathname.split("/").pop();
      await getUserTest(req, res, id);
      return true;
    }

    if (pathname === "/api/user/tests" && req.method === "POST") {
      await createUserTest(req, res);
      return true;
    }

    if (pathname === "/api/user/profile" && req.method === "POST") {
      await updateProfile(req, res);
      return true;
    }

    if (pathname === "/api/user/password" && req.method === "POST") {
      await updatePassword(req, res);
      return true;
    }

    if (pathname === "/api/user/privacy" && req.method === "POST") {
      await updatePrivacy(req, res);
      return true;
    }

    if (pathname === "/api/products" && req.method === "GET") {
      await getProducts(req, res);
      return true;
    }

    if (pathname === "/api/admin/products" && req.method === "POST") {
      await createProduct(req, res);
      return true;
    }

    if (pathname.startsWith("/api/admin/products/") && req.method === "PUT") {
      const id = pathname.split("/").pop();
      await updateProduct(req, res, id);
      return true;
    }

    if (pathname.startsWith("/api/admin/products/") && req.method === "DELETE") {
      const id = pathname.split("/").pop();
      await deleteProduct(req, res, id);
      return true;
    }

    if (pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "API route not found." });
      return true;
    }

    return false;
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error(error.message);
      sendJson(res, 503, { error: `Database unavailable at ${databaseTarget()}.` });
      return true;
    }

    console.error(error);
    sendJson(res, 500, { error: "Server error." });
    return true;
  }
}

function shouldProtectPage(pathname) {
  const protectedPages = new Set([
    "/",
    "/activity",
    "/admin",
    "/account",
    "/cart",
    "/dashboard",
    "/learn",
    "/my-activity",
    "/myPTE",
    "/mypte",
    "/users/edit-user-account",
    "/users/edit-user-account/collapse",
  ]);

  if (protectedPages.has(pathname)) {
    return true;
  }

  return /^\/my-activity\/test-score\/[^/]+$/.test(pathname);
}

async function authorizePageAccess(req, res, pathname) {
  if (!shouldProtectPage(pathname)) {
    return false;
  }

  const user = await currentUser(req);

  if (!user) {
    res.writeHead(302, { Location: "/login" });
    res.end();
    return true;
  }

  if (pathname === "/admin" && user.role !== "ADMIN") {
    res.writeHead(302, { Location: "/login" });
    res.end();
    return true;
  }

  return false;
}

async function handleRequest(req, res) {
  const url = new URL(req.url || "/", "http://localhost");

  if (await handleApiRequest(req, res, url.pathname)) {
    return;
  }

  if (await authorizePageAccess(req, res, url.pathname)) {
    return;
  }

  const filePath = resolveRequestPath(req.url || "/");

  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      res.end("Unable to read file");
      return;
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
    });
    res.end(content);
  });
}

function listen(port, attemptsLeft = 10) {
  const server = http.createServer(handleRequest);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0 && !process.env.PORT) {
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, () => {
    console.log(`Pearson dashboard app running at http://localhost:${port}`);
  });
}

ensureSessionStore()
  .then(ensureDefaultAdmin)
  .then(ensureScoreReportStore)
  .then(() => listen(preferredPort))
  .catch((error) => {
    if (isDatabaseConnectionError(error)) {
      console.error(`Database unavailable at ${databaseTarget()}; skipping startup seed.`);
      listen(preferredPort);
      return;
    }

    console.error(error);
    process.exit(1);
  });
