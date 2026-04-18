import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

import { PORT } from "./config.js";
import {
  startHaSocket,
  getState,
  setLastRoute,
  callService,
} from "./ha-socket.js";
import healthRouter from "./routes/health.js";
import docsRouter from "./routes/docs.js";
import weatherRouter from "./routes/weather.js";
import photosRouter from "./routes/photos.js";
import viewsRouter from "./routes/views.js";
import videosRouter from "./routes/videos.js";
import energyRouter from "./routes/energy.js";
import homeRouter from "./routes/home.js";
import entitiesRouter from "./routes/entities.js";
import climateRouter from "./routes/climate.js";

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
io.themeMode = "auto";

io.on("connection", (socket) => {
  socket.emit("current_view", io.currentView);
  socket.emit("current_theme_mode", io.themeMode);

  socket.on("change", (view) => {
    console.log({ io: "change", view });
    io.currentView = view;
    socket.broadcast.emit("change_view", view);
    if (view !== "blank") setLastRoute(view);
  });

  socket.on("next_photo", () => {
    console.log({ io: "next_photo" });
    socket.broadcast.emit("next_photo");
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

  socket.on("entity:subscribe", (entityId) => {
    if (typeof entityId !== "string" || !entityId) return;
    socket.join(`entity:${entityId}`);
    const cached = getState(entityId);
    if (cached) socket.emit(entityId, cached);
  });

  socket.on("entity:unsubscribe", (entityId) => {
    if (typeof entityId !== "string" || !entityId) return;
    socket.leave(`entity:${entityId}`);
  });

  socket.on("entity:call", (payload) => {
    if (!payload || typeof payload !== "object") return;
    const ok = callService(payload);
    if (!ok) console.warn("[entity:call] rejected", payload);
  });
});

app.use(express.json());
app.use(express.static(clientBuildDir));

// API routes
app.use("/api", healthRouter);
app.use("/api/docs", docsRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/photos", photosRouter);
app.use("/api", viewsRouter);
app.use("/api/energy", energyRouter);
app.use("/api/entities", entitiesRouter);
app.use("/api/home/climate", climateRouter);
app.use("/api/home", homeRouter);
app.use("/api/videos", videosRouter);
app.use("/videos", videosRouter);

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(clientBuildDir, "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`OLED Dashboard server running on port ${PORT}`);
  io.emit("ready");
  startHaSocket(io);
});
