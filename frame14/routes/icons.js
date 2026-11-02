import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Router } from "express";

const require = createRequire(import.meta.url);
// Material Design Icons' SVGs (@mdi/svg, a server dependency — the set is
// far too big for the bundle), one file per icon.
const MDI_DIR = path.join(
  path.dirname(require.resolve("@mdi/svg/package.json")),
  "svg",
);
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * GET /api/icon/:name (0.139) — one Material Design Icons glyph, as Home
 * Assistant names an entity's icon ("mdi:ceiling-light" → `ceiling-light`),
 * for the Lights page to draw a light's own icon (components/MdiIcon). The
 * set is versioned with the package, so the answer is cacheable for good;
 * a name that isn't one (anything but lower-case words joined by hyphens)
 * is a 400, one the set hasn't got a 404.
 */
const router = Router();

router.get("/:name", (req, res) => {
  const { name } = req.params;
  if (!NAME.test(name)) {
    res
      .status(400)
      .json({ error: "An icon name is lower-case words joined by hyphens." });
    return;
  }
  const file = path.join(MDI_DIR, `${name}.svg`);
  if (!fs.existsSync(file)) {
    res.status(404).json({ error: `No icon named "${name}".` });
    return;
  }
  res.type("image/svg+xml");
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(file);
});

export default router;
