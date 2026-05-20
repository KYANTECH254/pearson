function sendJson(res, statusCode, payload, headers) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...(headers || {}),
  });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separatorIndex = cookie.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      cookies[decodeURIComponent(cookie.slice(0, separatorIndex))] = decodeURIComponent(cookie.slice(separatorIndex + 1));
      return cookies;
    }, {});
}

module.exports = {
  parseCookies,
  parseJsonBody,
  sendJson,
};
