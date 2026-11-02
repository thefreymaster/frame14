import { Router } from "express";
import { entitiesPayload } from "../ha-areas.js";

const router = Router();

// The entity config, with the lights as resolved by room (ha-areas.js, 0.122:
// `lights` grows by the configured areas' lights, `rooms` groups them).
router.get("/", (_req, res) => {
  res.json(entitiesPayload());
});

export default router;
