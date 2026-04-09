import express from "express";
import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

import { PORT } from "./config.js";
import { startMotionWatcher } from "./ha-motion.js";
import healthRouter from "./routes/health.js";
import docsRouter from "./routes/docs.js";
import weatherRouter from "./routes/weather.js";
import photosRouter from "./routes/photos.js";
import viewsRouter from "./routes/views.js";
import videosRouter from "./routes/videos.js";
import energyRouter from "./routes/energy.js";
import homeRouter, { fetchHomeData } from "./routes/home.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const clientBuildDir =
  [path.join(__dirname, "dist"), path.join(__dirname, "build")].find((dir) =>
    fs.existsSync(path.join(dir, "index.html"))
  ) ?? path.join(__dirname, "dist");

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Make io available to route handlers via app.locals
app.locals.io = io;
io.currentView = "clock";

io.on("connection", (socket) => {
  socket.emit("current_view", io.currentView);

  socket.on("change", (view) => {
    console.log({ io: "change", view });
    io.currentView = view;
    socket.broadcast.emit("change_view", view);
  });

  socket.on("next_photo", () => {
    console.log({ io: "next_photo" });
    socket.broadcast.emit("next_photo");
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
app.use("/api/home", homeRouter);
app.use("/api/videos", videosRouter);
app.use("/videos", videosRouter);

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(clientBuildDir, "index.html"));
});

httpServer.listen(PORT, () => {
  console.log(`OLED Dashboard server running on port ${PORT}`);
  startMotionWatcher(io);

  // Poll HA every 10s and push home data to all clients via Socket.IO
  setInterval(async () => {
    try {
      const data = await fetchHomeData();
      io.emit("home_update", data);
    } catch (err) {
      console.error("Home broadcast error:", err.message);
    }
  }, 10_000);
});
