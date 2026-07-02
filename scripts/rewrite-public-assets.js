const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const textExtensions = new Set([".css", ".html", ".js", ".json"]);

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

function findLocalAsset(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  const relativePath = pathname.replace(/^\/+/, "");
  const parsedPath = path.parse(relativePath);
  const hostRoot = path.join(publicDir, "assets", parsed.hostname);
  const directPath = path.join(hostRoot, relativePath);
  const extension = parsedPath.ext || ".html";

  const candidates = [directPath];

  if (parsed.search) {
    const queryToken = encodeQuery(parsed.search);
    candidates.push(path.join(hostRoot, parsedPath.dir, `${parsedPath.name}__${queryToken}${extension}`));
    candidates.push(path.join(hostRoot, parsedPath.dir, `${parsedPath.name}__v_${parsed.searchParams.get("v")}${extension}`));
  }

  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
}

function publicUrl(filePath) {
  return `/${path.relative(publicDir, filePath).split(path.sep).join("/")}`;
}

function rewriteText(text) {
  return text
    .replace(/https?:\/\/[^"' <>)]+/g, (rawUrl) => {
      const normalized = rawUrl.replace(/&amp;/g, "&");

      try {
        const localAsset = findLocalAsset(normalized);
        return localAsset ? publicUrl(localAsset) : rawUrl;
      } catch {
        return rawUrl;
      }
    })
    .replace(/\.\.\/cdn\.pearsonpte\.com\//g, "/assets/cdn.pearsonpte.com/")
    .replace(/\/assets\/cdn\.pearsonpte\.com\/ignite-design\.css@v=6\.1\.1\.css/g, "/assets/cdn.pearsonpte.com/ignite-design__v_6_1_1.css")
    .replace(/href="\/css\//g, 'href="/assets/id.mypte.pearsonpte.com/css/')
    .replace(/href="\/fonts\//g, 'href="/assets/id.mypte.pearsonpte.com/fonts/')
    .replace(/href="\/lib\//g, 'href="/assets/id.mypte.pearsonpte.com/lib/')
    .replace(/src="\/images\//g, 'src="/assets/id.mypte.pearsonpte.com/images/')
    .replace(/src="\/js\//g, 'src="/assets/id.mypte.pearsonpte.com/js/')
    .replace(/src="\/lib\//g, 'src="/assets/id.mypte.pearsonpte.com/lib/')
    .replace(/(\/assets\/id\.mypte\.pearsonpte\.com\/[^"'?]+)\.(css|js)\?v=([0-9]+)/g, "$1__v_$3.$2")
    .replace(/(href|src)="https:\/\/mypte\.pearsonpte\.com\/([^"?]+)(?:\?[^"]*)?"/g, '$1="/$2"');
}

const files = walk(publicDir).filter((filePath) => textExtensions.has(path.extname(filePath).toLowerCase()));

for (const filePath of files) {
  const original = fs.readFileSync(filePath, "utf8");
  const rewritten = rewriteText(original);

  if (rewritten !== original) {
    fs.writeFileSync(filePath, rewritten);
  }
}

console.log(`Rewrote local asset references in ${files.length} public files.`);
