import os from "node:os";
import { Router } from "express";
import { HA_URL, VERSION } from "../config.js";
import { isHaConnected } from "../ha-socket.js";

const router = Router();

/**
 * The caller's address as this server sees it: the real one when a proxy
 * passes it on (Cloudflare's cf-connecting-ip, then x-forwarded-for's first
 * hop), else the socket's own, without IPv4-in-IPv6 dressing.
 */
function clientAddress(req) {
  const cf = req.headers["cf-connecting-ip"];
  if (typeof cf === "string" && cf) return cf;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const address = req.socket?.remoteAddress;
  return address ? address.replace(/^::ffff:/, "") : null;
}

/** The server's own IPv4 addresses, loopback left out. With the add-on's
 *  host networking these are the Home Assistant host's. */
function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && (i.family === "IPv4" || i.family === 4) && !i.internal)
    .map((i) => i.address);
}

function haHost() {
  try {
    return new URL(HA_URL).host;
  } catch {
    return HA_URL;
  }
}

// GET /api/connection — what the header's connection menu shows.
router.get("/", (req, res) => {
  res.json({
    client: { address: clientAddress(req) },
    server: {
      hostname: os.hostname(),
      addresses: lanAddresses(),
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
    },
    homeAssistant: { host: haHost(), connected: isHaConnected() },
  });
});

export default router;
