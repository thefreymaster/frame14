import { Router } from "express";
import { SCREEN_TYPE, VERSION, ASSIST_PIPELINE_ID } from "../config.js";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    message: "API is running",
    screenType: SCREEN_TYPE,
    version: VERSION,
    // "" means the preferred pipeline is used; /api/assist/config resolves it.
    assistPipeline: ASSIST_PIPELINE_ID,
  });
});

export default router;
