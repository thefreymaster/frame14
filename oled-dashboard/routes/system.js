import { Router } from "express";
import { HA_URL, HA_TOKEN, VERSION } from "../config.js";
import { getState, isHaConnected } from "../ha-socket.js";

const router = Router();

// The Supervisor integration's update entities carry the installed versions
// as attributes. Home Assistant Container has no OS and no Supervisor, so its
// core version comes from /api/config instead and its OS is null.
const CORE_UPDATE = "update.home_assistant_core_update";
const OS_UPDATE = "update.home_assistant_operating_system_update";

// Versions change on an update, so what HA last said is good for a while:
// the footer asks every few minutes and shouldn't cost HA a call each time.
const MEMO_MS = 5 * 60_000;
const memo = new Map(); // key → { value, at }

async function remember(key, load) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.value;
  const value = await load();
  memo.set(key, { value, at: Date.now() });
  return value;
}

async function haGet(path) {
  if (!HA_TOKEN) return null;
  try {
    const res = await fetch(`${HA_URL}/api/${path}`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** An update entity's installed version: the state cache first, then HA. */
async function installedVersion(entityId) {
  const cached = getState(entityId)?.attributes?.installed_version;
  if (cached) return String(cached);
  return remember(entityId, async () => {
    const state = await haGet(`states/${entityId}`);
    const version = state?.attributes?.installed_version;
    return version ? String(version) : null;
  });
}

// GET /api/system — the desktop footer's tags: this add-on's installed
// version, Home Assistant's core and OS versions, and whether the server's
// link to Home Assistant is up.
router.get("/", async (_req, res) => {
  const [core, os] = await Promise.all([
    installedVersion(CORE_UPDATE).then(
      (v) =>
        v ??
        remember("config", async () => {
          const config = await haGet("config");
          return config?.version ? String(config.version) : null;
        }),
    ),
    installedVersion(OS_UPDATE),
  ]);
  res.json({
    version: VERSION,
    homeAssistant: {
      connected: isHaConnected(),
      coreVersion: core ?? null,
      osVersion: os ?? null,
    },
  });
});

export default router;
