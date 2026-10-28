import { Router } from "express";
import { ADDON_NAME, VERSION } from "../config.js";
import {
  getAllStates,
  installUpdate,
  isHaConnected,
  refreshEntity,
  reloadAddonStore,
} from "../ha-socket.js";

const router = Router();

/**
 * The add-on's update entity: the Supervisor keeps one per installed add-on
 * (`update.<name>_update`, titled with the add-on's name; `on` while the
 * add-on store has a newer version, with `installed_version` and
 * `latest_version`). Found by its title, since the id is the name slugified
 * Home Assistant's way. Null outside the add-on, or until the cache is primed.
 */
function updateEntity() {
  for (const [id, s] of getAllStates()) {
    if (id.startsWith("update.") && s?.attributes?.title === ADDON_NAME) {
      return { id, ...s };
    }
  }
  return null;
}

/** The software as the server knows it: GET's answer. */
function softwareInfo() {
  const s = updateEntity();
  const a = s?.attributes ?? {};
  return {
    installed: VERSION,
    update: s
      ? {
          entityId: s.id,
          installed: a.installed_version ?? null,
          latest: a.latest_version ?? null,
          available: s.state === "on",
          releaseUrl: a.release_url ?? null,
        }
      : null,
  };
}

// How long the refreshed update entity gets to arrive over the WebSocket
// before a check answers with what the cache has.
const REFRESH_WAIT_MS = 2_000;

// GET /api/software — the installed version and what the store has.
router.get("/", (_req, res) => {
  res.json(softwareInfo());
});

// POST /api/software/check — "Check for updates" without opening Home
// Assistant: the Supervisor reloads the add-on store, the add-on's update
// entity is refreshed, and the answer is GET's a moment later, with
// `checkedAt`. 502 when Home Assistant couldn't (the token's user must be
// an admin; the Supervisor must be there), 503 with HA down.
router.post("/check", async (_req, res) => {
  if (!isHaConnected()) {
    res.status(503).json({ error: "Home Assistant is not connected" });
    return;
  }
  try {
    await reloadAddonStore();
  } catch (e) {
    res.status(502).json({ error: `Home Assistant couldn't reload the add-on store: ${e.message}` });
    return;
  }
  const s = updateEntity();
  if (s) refreshEntity(s.id);
  await new Promise((r) => setTimeout(r, REFRESH_WAIT_MS));
  res.json({ ...softwareInfo(), checkedAt: new Date().toISOString() });
});

// POST /api/software/install — install the store's newer version: Home
// Assistant's update.install on the add-on's update entity. The add-on
// restarts under this request, so the answer says only that it was asked
// (202); 409 with nothing newer, 404 without the entity, 503 with HA down.
router.post("/install", (_req, res) => {
  const s = updateEntity();
  if (!s) {
    res.status(404).json({ error: "Home Assistant has no update entity for the add-on" });
    return;
  }
  if (s.state !== "on") {
    res.status(409).json({ error: "There is nothing newer to install" });
    return;
  }
  if (!installUpdate(s.id)) {
    res.status(503).json({ error: "Home Assistant is not connected" });
    return;
  }
  res.status(202).json({ ok: true, version: s.attributes?.latest_version ?? null });
});

export default router;
