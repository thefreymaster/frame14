// Requests a browser makes on another site's behalf (0.151.0). Without a
// login, another web page could drive the add-on through a browser that can
// reach it — a page opened on a phone on the house's Wi-Fi, or another app
// under the same domain behind Cloudflare Access, whose cookie rides along to
// a same-site request: the socket turns lights and switches on and off, and
// some REST routes act on a plain GET (`/api/screen/off`, `/api/change/:view`,
// for Home Assistant's rest_command) or a bodyless POST
// (`/api/software/install`), which a page can send without reading the reply.
// A browser says where a request comes from:
//   - Sec-Fetch-Site (every current browser): only "same-origin" and "none"
//     (typed in, a bookmark) pass; "same-site" and "cross-site" are refused.
//     The browser works it out from the page itself, so a proxy rewriting
//     the Host (cloudflared's httpHostHeader) can't upset it.
//   - Origin, from a browser too old for that: it must be this server's own,
//     the Host or — behind a proxy — X-Forwarded-Host.
// A request with neither isn't a browser's (Home Assistant's rest_command,
// curl) and passes: this keeps web pages out, not anything that can reach
// the port, which is the network's to keep out.

/** Whether a request with these headers is a browser's from another site. */
export function crossSite(headers) {
  const site = headers["sec-fetch-site"];
  if (typeof site === "string" && site)
    return site !== "same-origin" && site !== "none";
  const origin = headers.origin;
  if (!origin) return false;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    // "null": a sandboxed frame, a file.
    return true;
  }
  const own = [
    headers.host,
    ...String(headers["x-forwarded-host"] ?? "").split(","),
  ]
    .map((h) => String(h ?? "").trim())
    .filter(Boolean);
  return !own.includes(host);
}

const from = (headers) =>
  headers.origin ?? `a ${headers["sec-fetch-site"]} page`;

/** Express: a cross-site request is a 403. */
export function refuseCrossSite(req, res, next) {
  if (!crossSite(req.headers)) {
    next();
    return;
  }
  console.warn(
    `[origin] refused ${req.method} ${req.originalUrl} from ${from(req.headers)}`,
  );
  res.status(403).json({ error: "Cross-site request refused" });
}

/** Socket.IO's allowRequest: a cross-site handshake is refused. */
export function allowSocket(req, callback) {
  if (!crossSite(req.headers)) {
    callback(null, true);
    return;
  }
  console.warn(`[origin] refused a socket from ${from(req.headers)}`);
  callback("Cross-site request refused", false);
}
