import { Router } from "express";
import { ENTITIES } from "../entities.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(ENTITIES);
});

export default router;
