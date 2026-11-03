import { Router } from "express";
import swaggerUiDist from "swagger-ui-dist";
import express from "express";
import { openApiDocument, renderSwaggerUiHtml } from "../openapi.js";

const router = Router();
const swaggerUiDir = swaggerUiDist.getAbsoluteFSPath();

router.get("/openapi.json", (_req, res) => {
  res.status(200).json(openApiDocument);
});

router.use("/", express.static(swaggerUiDir, { index: false }));

router.get("/", (_req, res) => {
  res.type("html").send(
    renderSwaggerUiHtml({ specUrl: "/api/docs/openapi.json" })
  );
});

export default router;
