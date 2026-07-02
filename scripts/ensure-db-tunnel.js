const net = require("net");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");

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

const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = 15432;
const REMOTE_HOST = "127.0.0.1";
const REMOTE_PORT = 5432;
const SSH_HOST = process.env.DB_TUNNEL_SSH_HOST || "kyan-server";

function shouldUseTunnel() {
  if (process.env.DB_TUNNEL_DISABLED === "true") {
    return false;
  }

  try {
    const url = new URL(process.env.DATABASE_URL || "");
    return url.hostname === LOCAL_HOST && Number(url.port || 5432) === LOCAL_PORT;
  } catch (error) {
    return true;
  }
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: LOCAL_HOST, port: LOCAL_PORT });
    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function waitForTunnel() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await canConnect()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function ensureDatabaseTunnel() {
  if (!shouldUseTunnel()) {
    return false;
  }

  if (await canConnect()) {
    console.log(`Database tunnel already listening on ${LOCAL_HOST}:${LOCAL_PORT}.`);
    return true;
  }

  const args = [
    "-N",
    "-L",
    `${LOCAL_HOST}:${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}`,
    SSH_HOST
  ];

  const child = spawn("ssh", args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();

  if (!(await waitForTunnel())) {
    throw new Error(`Failed to open database tunnel to ${SSH_HOST}. Try running: ssh -N -L ${LOCAL_HOST}:${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT} ${SSH_HOST}`);
  }

  console.log(`Database tunnel ready on ${LOCAL_HOST}:${LOCAL_PORT}.`);
  return true;
}

if (require.main === module) {
  ensureDatabaseTunnel().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  ensureDatabaseTunnel,
};
