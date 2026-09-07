import fs from "node:fs";
import path from "node:path";

const roots = ["client/src", "server"];
const topFiles = ["vite.config.ts", "capacitor.config.ts", "package.json"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json"]);

const forbidden = [
  ["MANUS_DOMAIN", /(?:manus\.im|manus\.space)/i],
  ["FORGE_RUNTIME", /(?:BUILT_IN_FORGE|forgeApiUrl|forgeApiKey|forge\.manus)/i],
  ["MANUS_VITE_RUNTIME", /vite-plugin-manus-runtime/i],
  ["MANUS_CRON_HEADER", /x-manus-cron-task-uid/i],
  ["LEGACY_OAUTH_ENV", /(?:OAUTH_SERVER_URL|VITE_OAUTH_PORTAL_URL|VITE_APP_ID)/],
  ["LEGACY_MANUS_SDK", /(?:\.\/_core\/sdk|\.\/sdk["']|manusTypes)/],
  ["HUME_KEY_TO_CLIENT", /return\s*\{\s*apiKey\s*,\s*configId\s*\}/],
  ["HUME_CLIENT_APIKEY_AUTH", /auth:\s*\{\s*type:\s*["']apiKey["']/],
];

function shouldScan(file) {
  const base = path.basename(file);
  if (base.includes(".test.") || base.includes(".spec.")) return false;
  if (file.includes(`${path.sep}__fixtures__${path.sep}`)) return false;
  return allowedExtensions.has(path.extname(file));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (shouldScan(full)) out.push(full);
  }
  return out;
}

const files = [...roots.flatMap(root => walk(root)), ...topFiles.filter(fs.existsSync)];
const findings = [];
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const [code, pattern] of forbidden) {
    if (pattern.test(text)) findings.push({ code, file });
  }
}

if (findings.length) {
  console.error(JSON.stringify({ status: "HOLD_RUNTIME_DEPENDENCY", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "PASS_ACTIVE_SOURCE_AUDIT", filesScanned: files.length }, null, 2));
