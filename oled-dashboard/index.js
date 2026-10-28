import compression from "compression";
import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "[fatal] unhandledRejection:",
    reason instanceof Error ? reason.stack : reason,
  );
  process.exit(1);
});

import { INGRESS_PORT, PORT } from "./config.js";
import {
  startHaSocket,
  getState,
  setLastRoute,
  callService,
  TRANSIENT_VIEWS,
} from "./ha-socket.js";
import healthRouter from "./routes/health.js";
import docsRouter from "./routes/docs.js";
import weatherRouter from "./routes/weather.js";
import photosRouter from "./routes/photos.js";
import viewsRouter from "./routes/views.js";
import videosRouter from "./routes/videos.js";
import energyRouter from "./routes/energy.js";
import circuitsRouter from "./routes/circuits.js";
import homeRouter from "./routes/home.js";
import entitiesRouter from "./routes/entities.js";
import connectionRouter from "./routes/connection.js";
import climateRouter from "./routes/climate.js";
import vacuumRouter from "./routes/vacuum.js";
import fanRouter from "./routes/fan.js";
import marqueeRouter from "./routes/marquee.js";
import cameraRouter from "./routes/camera.js";
import printerRouter from "./routes/printer.js";
import assistRouter, { attachAssistSocket } from "./routes/assist.js";
import ingressRouter from "./routes/ingress.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const clientBuildDir =
  [path.join(__dirname, "dist"), path.join(__dirname, "build")].find((dir) =>
    fs.existsSync(path.join(dir, "index.html")),
  ) ?? path.join(__dirname, "dist");

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Make io available to route handlers via app.locals
app.locals.io = io;
io.currentView = "clock";
io.themeMode = "dark";
io.navVisible = true;
// The photo each frame's slideshow is on (socket id → asset id), for the
// remotes' photo grid to highlight.
io.photosShown = new Map();

function photosShown() {
  return [...new Set(io.photosShown.values())];
}

io.on("connection", (socket) => {
  socket.emit("current_view", io.currentView);
  socket.emit("current_theme_mode", io.themeMode);
  socket.emit("nav_visibility", io.navVisible);
  socket.emit("photos_shown", photosShown());

  socket.on("change", (view) => {
    console.log({ io: "change", view });
    io.currentView = view;
    socket.broadcast.emit("change_view", view);
    if (!TRANSIENT_VIEWS.has(view)) setLastRoute(view);
  });

  socket.on("next_photo", () => {
    console.log({ io: "next_photo" });
    socket.broadcast.emit("next_photo");
  });

  // A frame's slideshow reports the photo it's on, and null when it leaves.
  socket.on("photo_shown", (assetId) => {
    if (assetId !== null && typeof assetId !== "string") return;
    if (assetId) io.photosShown.set(socket.id, assetId);
    else io.photosShown.delete(socket.id);
    io.emit("photos_shown", photosShown());
  });

  socket.on("disconnect", () => {
    if (io.photosShown.delete(socket.id)) {
      io.emit("photos_shown", photosShown());
    }
  });

  // A remote picked a photo in its grid: the frames show it and go on from
  // there.
  socket.on("show_photo", (pick) => {
    const { albumId, assetId } = pick ?? {};
    if (typeof albumId !== "string" || typeof assetId !== "string") return;
    console.log({ io: "show_photo", albumId, assetId });
    socket.broadcast.emit("show_photo", { albumId, assetId });
  });

  socket.on("refresh", () => {
    console.log({ io: "refresh" });
    socket.broadcast.emit("reload");
  });

  socket.on("theme_mode", (pref) => {
    if (pref !== "auto" && pref !== "bright" && pref !== "dark") return;
    console.log({ io: "theme_mode", pref });
    io.themeMode = pref;
    socket.broadcast.emit("theme_mode", pref);
  });

  socket.on("nav_visibility", (v) => {
    if (typeof v !== "boolean") return;
    console.log({ io: "nav_visibility", v });
    io.navVisible = v;
    socket.broadcast.emit("nav_visibility", v);
  });

  socket.on("entity:subscribe", (entityId, ack) => {
    if (typeof entityId !== "string" || !entityId) return;
    socket.join(`entity:${entityId}`);
    const cached = getState(entityId);
    if (cached) socket.emit(entityId, cached);
    // Answered after the state, and also when there is none, so the client
    // can tell when it has everything there is (the launch splash waits on it).
    if (typeof ack === "function") ack();
  });

  socket.on("entity:unsubscribe", (entityId) => {
    if (typeof entityId !== "string" || !entityId) return;
    socket.leave(`entity:${entityId}`);
  });

  socket.on("entity:call", (payload) => {
    if (!payload || typeof payload !== "object") return;
    const ok = callService(payload);
    if (ok) console.log("[entity:call] sent", payload);
    else console.warn("[entity:call] rejected", payload);
  });

  // The connection menu's round-trip check: answered at once.
  socket.on("echo", (ack) => {
    if (typeof ack === "function") ack();
  });

  attachAssistSocket(socket);
});

// The bundle is 1.2 MB of JavaScript, a third of that gzipped; the forecasts
// and the energy curves are tens of KB of JSON. Streams (the cameras' MJPEG,
// the videos) aren't compressible and pass through untouched.
app.use(
  compression({
    filter: (req, res) =>
      !/^\/(api\/(camera|printer\/camera|assist)|videos)\//.test(req.path) &&
      compression.filter(req, res),
  }),
);
app.use(express.json());
app.use(
  express.static(clientBuildDir, {
    setHeaders(res, filePath) {
      // Vite names the bundle's files by content, so a browser can keep one
      // for good; everything else (index.html, sw.js, the icons) is checked
      // with the server each time, which the ETag makes a 304.
      res.setHeader(
        "Cache-Control",
        /[\\/]assets[\\/]/.test(filePath)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    },
  }),
);

// API routes
app.use("/api", healthRouter);
app.use("/api/docs", docsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/photos", photosRouter);
app.use("/api", viewsRouter);
app.use("/api/energy", energyRouter);
app.use("/api/circuits", circuitsRouter);
app.use("/api/entities", entitiesRouter);
app.use("/api/connection", connectionRouter);
app.use("/api/home/climate", climateRouter);
app.use("/api/home/vacuum", vacuumRouter);
app.use("/api/home/fan", fanRouter);
app.use("/api/marquee", marqueeRouter);
app.use("/api/camera", cameraRouter);
app.use("/api/printer", printerRouter);
app.use("/api/assist", assistRouter);
app.use("/api/home", homeRouter);
app.use("/api/videos", videosRouter);
app.use("/videos", videosRouter);

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(clientBuildDir, "index.html"), {
    headers: { "Cache-Control": "no-cache" },
  });
});

// Global Express error handler
app.use((err, _req, res, _next) => {
  console.error("[error] unhandled route error:", err.message, err.stack);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
});

httpServer.listen(PORT, () => {
  console.log(`Frame14 server running on port ${PORT}`);
  io.emit("ready");
  startHaSocket(io);
});

// Home Assistant's ingress (the add-on's Open Web UI button and sidebar
// entry) gets its own port, which only sends the browser on to web_ui_url.
// Failing to bind it must not take the dashboard down with it.
if (INGRESS_PORT) {
  const ingressApp = express();
  ingressApp.use(ingressRouter);
  createServer(ingressApp)
    .on("error", (err) => {
      console.error(`[ingress] can't listen on port ${INGRESS_PORT}:`, err.message);
    })
    .listen(INGRESS_PORT, () => {
      console.log(`Ingress page listening on port ${INGRESS_PORT}`);
    });
}
