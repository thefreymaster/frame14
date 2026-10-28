import { Router } from "express";
import { ADDON_NAME, VERSION } from "../config.js";
import { getAllStates } from "../ha-socket.js";

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

// GET /api/software — the installed version and what the store has.
router.get("/", (_req, res) => {
  const s = updateEntity();
  const a = s?.attributes ?? {};
  res.json({
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
  });
});

export default router;
