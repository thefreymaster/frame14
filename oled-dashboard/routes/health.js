import { Router } from "express";
import { SCREEN_TYPE, VERSION } from "../config.js";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ ok: true, message: "API is running", screenType: SCREEN_TYPE, version: VERSION });
});

export default router;
