import { Router } from "express";
import { WEB_UI_URL } from "../config.js";

// Home Assistant's "Open Web UI" button and the add-on's sidebar entry open
// the add-on through ingress: an iframe in Home Assistant's page, proxied to
// INGRESS_PORT under a path prefix. The dashboard can't run there (its assets,
// API and socket live at the root), so this port answers every request with a
// page that sends the whole tab on to web_ui_url instead.

const router = Router();

/** web_ui_url when it's an http(s) address, else null. */
function webUiUrl() {
  try {
    const url = new URL(WEB_UI_URL);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function renderPage(url) {
  // replace(), not an assignment: Back then returns to the add-on's page
  // rather than to this one, which would send the tab straight back out.
  // The link covers a frame that isn't allowed to move its parent.
  const body = url
    ? `<p>Opening Frame14…</p>
<p><a href="${escapeHtml(url)}" target="_top">${escapeHtml(url)}</a></p>
<script>
  try {
    window.top.location.replace(${JSON.stringify(url).replace(/</g, "\\u003c")});
  } catch {}
</script>`
    : `<p>Set <code>web_ui_url</code> on the Frame14 add-on's Configuration tab to the address you open Frame14 at, and this button will take you there.</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Frame14</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-content: center; padding: 1rem; font: 1rem/1.5 system-ui, sans-serif; text-align: center; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

const page = renderPage(webUiUrl());

router.use((_req, res) => {
  res.set("Cache-Control", "no-store").type("html").send(page);
});

export default router;
