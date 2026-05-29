const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const defaultScoreReportPath = "/my-activity/test-score/latest";
const pages = [
  "index.html",
  "learn.html",
  "activity.html",
  "my-activity.html",
  "my-activity/test-score/template/index.html",
  "account.html",
  "cart.html",
].filter((page) => fs.existsSync(path.join(publicDir, page)));

const replacements = [
  [
    /(<a\b(?=[^>]*id="menu_item_myPTE")(?=[^>]*class="[^"]*\bignite-menu-button\b)[^>]*)(>)/g,
    ensureHref("/"),
  ],
  [
    /(<a\b(?=[^>]*id="menu_item_activity")(?=[^>]*class="[^"]*\bignite-menu-button\b)[^>]*)(>)/g,
    ensureHref("/my-activity"),
  ],
  [
    /(<a\b(?=[^>]*id="menu_item_learning")(?=[^>]*class="[^"]*\bignite-menu-button\b)[^>]*)(>)/g,
    ensureHref("/learn"),
  ],
  [
    /(<a\b(?=[^>]*id="menu_item_faq")(?=[^>]*class="[^"]*\bignite-menu-button\b)[^>]*)(>)/g,
    ensureHref("https://www.pearsonpte.com/help-center/"),
  ],
  [
    /(<div\b[^>]*id="shoppingcart-icon"[^>]*)(>)/g,
    ensureAttributes('role="link" tabindex="0" onclick="return window.localNavigate(\'/orders/shoppingcart\')"'),
  ],
  [
    /(<div\b[^>]*id="users\/edit-user-account\/collapse-profile-item"[^>]*)(>)/g,
    ensureAttributes('role="link" tabindex="0" onclick="return window.localNavigate(\'/account\')"'),
  ],
  [
    /(<div\b[^>]*id="logout-profile-item"[^>]*)(>)/g,
    ensureAttributes('role="link" tabindex="0" onclick="location.href=\'https://id.mypte.pearsonpte.com/Account/Login\';return false"'),
  ],
  [
    /(<a\b[^>]*id="link_view_score"[^>]*)(>)/g,
    ensureScoreHref(),
  ],
];
const localHeaderScript = '<script src="/local-header.js"></script>';
const localHeaderStyles = '<link rel="stylesheet" href="/local-header.css">';

function ensureHref(href) {
  return (match, start, end) => {
    const updated = start.includes(" href=")
      ? start.replace(/\shref="[^"]*"/, ` href="${href}"`)
      : `${start} href="${href}"`;

    return `${updated}${end}`;
  };
}

function ensureScoreHref() {
  return (match, start, end) => {
    const existingHref = start.match(/\shref="([^"]*)"/);

    if (existingHref && /\/my-activity\/test-score\/[^/?#"]+/.test(existingHref[1])) {
      return `${start}${end}`;
    }

    return ensureHref(defaultScoreReportPath)(match, start, end);
  };
}

function ensureAttributes(attributes) {
  return (match, start, end) => {
    const updated = attributes.split(" ").reduce((current, attribute) => {
      const [name] = attribute.split("=");
      const pattern = new RegExp(`\\s${name}="[^"]*"`);
      return pattern.test(current) ? current.replace(pattern, ` ${attribute}`) : `${current} ${attribute}`;
    }, start);

    return `${updated}${end}`;
  };
}

for (const page of pages) {
  const filePath = path.join(publicDir, page);
  let html = fs.readFileSync(filePath, "utf8");

  for (const [pattern, replace] of replacements) {
    html = html.replace(pattern, replace);
  }

  html = html.replace(/\bignite-profile-menu-popup opened\b/g, "ignite-profile-menu-popup");

  if (!html.includes(localHeaderStyles)) {
    html = html.replace("</head>", `  ${localHeaderStyles}\n</head>`);
  }

  if (!html.includes(localHeaderScript)) {
    html = html.replace("</body>", `    ${localHeaderScript}\n</body>`);
  }

  fs.writeFileSync(filePath, html);
}

console.log(`Normalized header routes in ${pages.length} pages.`);
