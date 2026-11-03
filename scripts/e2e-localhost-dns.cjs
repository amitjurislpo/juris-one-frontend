// Preloaded into the Playwright worker processes (NODE_OPTIONS=--require, set by playwright.config.ts when E2E_TENANT_HOST=1).
// Chromium resolves every <name>.localhost to this machine, but Node (and so Playwright's page.request / context.request) does not on
// Windows: it fails with ENOTFOUND. This makes Node resolve <name>.localhost exactly like "localhost" itself, so API calls made from the
// tests reach the same address the browser reaches. Nothing else is changed.
const dns = require("node:dns");
const util = require("node:util");

const originalLookup = dns.lookup;
const isLocalName = (hostname) => typeof hostname === "string" && hostname.toLowerCase().endsWith(".localhost");

function lookup(hostname, options, callback) {
  return originalLookup.call(dns, isLocalName(hostname) ? "localhost" : hostname, options, callback);
}
lookup[util.promisify.custom] = (hostname, options) => util.promisify(originalLookup)(isLocalName(hostname) ? "localhost" : hostname, options);
dns.lookup = lookup;

const originalPromisesLookup = dns.promises.lookup;
dns.promises.lookup = (hostname, options) => originalPromisesLookup.call(dns.promises, isLocalName(hostname) ? "localhost" : hostname, options);
