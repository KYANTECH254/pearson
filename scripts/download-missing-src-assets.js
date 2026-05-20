const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function encodeQuery(search) {
  return search
    .slice(1)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function localPathFor(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const relativePath = pathname.replace(/^\/+/, "");
  const parsedPath = path.parse(relativePath);
  const extension = parsedPath.ext || ".html";
  const fileName = parsed.search
    ? `${parsedPath.name}__${encodeQuery(parsed.search)}${extension}`
    : `${parsedPath.name}${extension}`;

  return path.join(publicDir, "assets", parsed.hostname, parsedPath.dir, fileName);
}

async function download(url) {
  const target = localPathFor(url);

  if (fs.existsSync(target)) {
    return false;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  return true;
}

async function main() {
  const htmlFiles = walk(publicDir).filter((filePath) => path.extname(filePath).toLowerCase() === ".html");
  const urls = new Set();

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, "utf8");

    for (const match of html.matchAll(/src="(https?:\/\/[^"]+)"/g)) {
      urls.add(match[1].replace(/&amp;/g, "&"));
    }

    for (const match of html.matchAll(/<link\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>/g)) {
      urls.add(match[1].replace(/&amp;/g, "&"));
    }
  }

  let downloaded = 0;

  for (const url of urls) {
    try {
      if (await download(url)) {
        downloaded += 1;
      }
    } catch (error) {
      console.warn(`Unable to download ${url}: ${error.message}`);
    }
  }

  console.log(`Downloaded ${downloaded} missing src assets.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
