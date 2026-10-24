export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Frame14 API",
    version: "1.0.0",
    description:
      "REST API for the Frame14 server. Connected Socket.IO clients can emit `change` and receive `change_view` events to synchronize view changes.",
  },
  servers: [
    {
      url: "/",
      description: "Current server",
    },
  ],
  tags: [
    {
      name: "Health",
      description: "Basic API status endpoints.",
    },
    {
      name: "Weather",
      description: "Weather data proxied from Home Assistant NWS integration.",
    },
    {
      name: "Photos",
      description: "Immich photo library proxy endpoints.",
    },
    {
      name: "Marquee",
      description: "Now-playing artwork for the configured media player.",
    },
    {
      name: "Camera",
      description: "Live view of the configured camera, proxied from Home Assistant.",
    },
    {
      name: "Printer",
      description:
        "The 3D printer page's camera and model thumbnail, proxied from Home Assistant. Entity IDs are derived from the configured printer status sensor.",
    },
    {
      name: "Vacuum",
      description: "The configured vacuums and their maps, from Home Assistant.",
    },
    {
      name: "Videos",
      description: "Video listing and delivery endpoints.",
    },
    {
      name: "Views",
      description: "Endpoints that broadcast view changes to connected clients.",
    },
    {
      name: "Energy",
      description: "Solar production and consumption data proxied from Home Assistant.",
    },
    {
      name: "Assist",
      description:
        "Voice assist. The spoken turn itself runs over Socket.IO (assist:start / assist:audio / assist:audio_end / assist:cancel, with assist:event and assist:error coming back); these endpoints cover configuration and audio playback.",
    },
  ],
  paths: {
    "/api": {
      get: {
        tags: ["Health"],
        operationId: "getApiStatus",
        summary: "Check API status",
        responses: {
          200: {
            description: "The API is reachable.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiStatus",
                },
              },
            },
          },
        },
      },
    },
    "/api/connection": {
      get: {
        tags: ["Health"],
        operationId: "getConnectionInfo",
        summary: "Describe the caller's connection",
        description:
          "What the header's connection menu shows: the caller's address as the server sees it (cf-connecting-ip, then x-forwarded-for, then the socket's), the server's hostname, LAN addresses, installed version and uptime, and whether the server's Home Assistant WebSocket is up.",
        responses: {
          200: {
            description: "The connection as seen from the server.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConnectionInfo" },
              },
            },
          },
        },
      },
    },
    "/api/weather": {
      get: {
        tags: ["Weather"],
        operationId: "getWeather",
        summary: "Get current weather and forecast",
        description:
          "Fetches the weather.nws_hourly entity from Home Assistant and returns normalized current conditions plus an 8-period forecast.",
        responses: {
          200: {
            description: "Current weather and forecast data.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeatherResponse" },
              },
            },
          },
          503: {
            description: "HA_TOKEN is not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          502: {
            description: "Home Assistant returned an error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/home/weather": {
      get: {
        tags: ["Weather"],
        operationId: "getHomeWeather",
        summary: "Get current weather and hourly + daily forecasts for HomeOverview",
        description:
          "Fetches the configured weather entity from Home Assistant plus its hourly and daily forecasts via the weather.get_forecasts service. Returns current state, temperature and unit, humidity, the next 8 hourly periods and up to 10 daily periods from today (today's gives its high and low). A failing forecast call leaves only that list empty.",
        responses: {
          200: {
            description: "Current weather and hourly forecast.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HomeWeatherResponse" },
              },
            },
          },
          503: {
            description: "HA_TOKEN is not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          502: {
            description: "Home Assistant returned an error.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          500: {
            description: "Failed to fetch weather from Home Assistant.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/photos/albums": {
      get: {
        tags: ["Photos"],
        operationId: "listAlbums",
        summary: "List Immich albums",
        responses: {
          200: {
            description: "List of albums.",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Album" } },
              },
            },
          },
          503: { description: "Immich not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/photos/albums/{albumId}": {
      get: {
        tags: ["Photos"],
        operationId: "getAlbum",
        summary: "Get assets in an Immich album",
        parameters: [{ name: "albumId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Album with its image assets in the album's order: by date taken, newest first unless the album is set to oldest first.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AlbumDetail" } } },
          },
          503: { description: "Immich not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/photos/asset/{assetId}/thumbnail": {
      get: {
        tags: ["Photos"],
        operationId: "getAssetThumbnail",
        summary: "Proxy an Immich asset thumbnail",
        parameters: [
          { name: "assetId", in: "path", required: true, schema: { type: "string" } },
          {
            name: "size",
            in: "query",
            required: false,
            description: "preview (default, about 1440px, for the slideshow) or thumbnail (Immich's small one, for the remote's photo grid).",
            schema: { type: "string", enum: ["preview", "thumbnail"] },
          },
        ],
        responses: {
          200: { description: "Thumbnail image.", content: { "image/jpeg": {}, "image/webp": {} } },
          503: { description: "Immich not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/marquee/art": {
      get: {
        tags: ["Marquee"],
        operationId: "getMarqueeArt",
        summary: "Proxy the poster art of the currently playing media",
        description:
          "When PLEX_URL and PLEX_TOKEN are configured, renders the poster at 1280x1920 through Plex's transcoder using the media_content_id (Plex ratingKey) from the cached Home Assistant state. Otherwise — or if that fetch fails — it falls back to proxying entity_picture from the same cached state. Either way clients never need an HA or Plex token. The v parameter is ignored by the server and exists only for client-side cache busting.",
        parameters: [
          {
            name: "v",
            in: "query",
            required: false,
            description: "Cache-busting token; changes when the media changes.",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Poster image.", content: { "image/jpeg": {} } },
          404: { description: "Nothing playing, or the media has no artwork.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "Home Assistant or the media player entity is not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/camera/stream": {
      get: {
        tags: ["Camera"],
        operationId: "getCameraStream",
        summary: "Proxy the MJPEG live stream of the configured camera",
        description:
          "Pipes Home Assistant's camera_proxy_stream for the camera entity in the entity config, attaching the server's HA token so clients never need one. The client supplies no entity ID. The upstream request is aborted as soon as the client disconnects.",
        responses: {
          200: { description: "MJPEG stream (multipart/x-mixed-replace).", content: { "multipart/x-mixed-replace": {} } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "No camera entity configured, or HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/camera/hls": {
      get: {
        tags: ["Camera"],
        operationId: "startCameraHls",
        summary: "Start Home Assistant's live HLS stream of the configured camera",
        description:
          "Asks Home Assistant (WebSocket camera/stream, format hls) to start or join the camera's live stream and returns the master playlist's URL under this server's HLS proxy. Works for an RTSP camera whose stills (and so the MJPEG stream) don't. The client supplies no entity ID.",
        responses: {
          200: { description: "The master playlist to play.", content: { "application/json": { schema: { type: "object", properties: { url: { type: "string", example: "/api/camera/hls/0123abcd/master_playlist.m3u8" } } } } } },
          502: { description: "Home Assistant could not start the stream.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "No camera entity configured, or HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/camera/hls/{token}/{file}": {
      get: {
        tags: ["Camera"],
        operationId: "getCameraHlsFile",
        summary: "Proxy one file of Home Assistant's HLS stream",
        description:
          "Forwards a playlist (master_playlist.m3u8, playlist.m3u8), the init segment (init.mp4) or a segment (segment/<n>.m4s, segment/<n>.<part>.m4s) of the stream started by /api/camera/hls. Only those files are served; only the LL-HLS _HLS_msn and _HLS_part query parameters are passed on. The token is the stream's own credential and no HA bearer token is sent.",
        parameters: [
          { name: "token", in: "path", required: true, schema: { type: "string" } },
          { name: "file", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "The playlist or media segment, as Home Assistant served it." },
          404: { description: "Not one of the stream's files." },
        },
      },
    },
    "/api/camera/snapshot": {
      get: {
        tags: ["Camera"],
        operationId: "getCameraSnapshot",
        summary: "Proxy a single still image from the configured camera",
        description:
          "Fallback for clients that cannot render the MJPEG stream: one JPEG from Home Assistant's camera_proxy for the configured camera entity, sent with no-store so each request is a fresh frame.",
        responses: {
          200: { description: "JPEG still image.", content: { "image/jpeg": {} } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "No camera entity configured, or HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/printer/camera/stream": {
      get: {
        tags: ["Printer"],
        operationId: "getPrinterCameraStream",
        summary: "Proxy the MJPEG live stream of the printer's camera",
        description:
          "Pipes Home Assistant's camera_proxy_stream for the printer's camera (camera.<printer>_camera, derived from the configured status sensor), attaching the server's HA token. The client supplies no entity ID. The upstream request is aborted as soon as the client disconnects.",
        responses: {
          200: { description: "MJPEG stream (multipart/x-mixed-replace).", content: { "multipart/x-mixed-replace": {} } },
          404: { description: "No printer configured, or it has no camera.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/printer/cover": {
      get: {
        tags: ["Printer"],
        operationId: "getPrinterCover",
        summary: "The current job's model thumbnail",
        description:
          "Home Assistant's image_proxy for the printer integration's cover image (Bambuddy image.<printer>_cover, ha-bambulab image.<printer>_cover_image). The client supplies no entity ID; `v` is ignored and exists only for cache busting (the page passes the image entity's state).",
        parameters: [{ name: "v", in: "query", required: false, schema: { type: "string" } }],
        responses: {
          200: { description: "The thumbnail image.", content: { "image/png": {} } },
          404: { description: "No printer configured, or it has no cover image.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/home/vacuum": {
      get: {
        tags: ["Vacuum"],
        operationId: "getVacuums",
        summary: "The configured vacuums",
        description:
          "State of each vacuum in the entity config, with its maps: the image entities its integration names after it (core Roborock: image.<vacuum>_<map>), found in the server's state cache.",
        responses: {
          200: {
            description: "One entry per configured vacuum.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      entity_id: { type: "string", example: "vacuum.roborock_q5_pro" },
                      name: { type: "string", example: "Robovac" },
                      state: { type: "string", example: "docked" },
                      progress: { type: "number", nullable: true },
                      battery: { type: "number", nullable: true },
                      maps: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            entity_id: { type: "string", example: "image.roborock_q5_pro_first_floor" },
                            name: { type: "string", example: "First Floor" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          500: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/home/vacuum/map/{entityId}": {
      get: {
        tags: ["Vacuum"],
        operationId: "getVacuumMap",
        summary: "One of a vacuum's maps",
        description:
          "Home Assistant's image_proxy for a map image entity. Only the maps of the configured vacuums (as listed by /api/home/vacuum) are served. `v` is ignored and exists only for cache busting (the page passes the image entity's state, the time the map last changed).",
        parameters: [
          { name: "entityId", in: "path", required: true, schema: { type: "string", example: "image.roborock_q5_pro_first_floor" } },
          { name: "v", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "The map image.", content: { "image/png": {} } },
          404: { description: "Not a configured vacuum's map.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          502: { description: "Home Assistant returned an error.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          503: { description: "HA_TOKEN is missing.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/videos/list": {
      get: {
        tags: ["Videos"],
        operationId: "listVideos",
        summary: "List available video files",
        responses: {
          200: {
            description: "A list of video filenames in the server videos directory.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VideoList",
                },
              },
            },
          },
          500: {
            description: "The server could not read the videos directory.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/energy": {
      get: {
        tags: ["Energy"],
        operationId: "getEnergy",
        summary: "Get current energy snapshot",
        description: "Returns today's production and consumption totals plus current live wattage from Home Assistant. Totals are measured from the lifetime energy counters when energy_lifetime_production/energy_lifetime_consumption are configured, otherwise from the 'today' sensors.",
        responses: {
          200: {
            description: "Current energy data.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EnergyResponse" },
              },
            },
          },
          503: {
            description: "HA_TOKEN or energy entities not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          500: {
            description: "Failed to fetch from Home Assistant.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/energy/today": {
      get: {
        tags: ["Energy"],
        operationId: "getEnergyToday",
        summary: "Get today's power curve",
        description:
          "Returns the solar production and home consumption power since local midnight, as quarter-hour means of Home Assistant's 5-minute statistics (in watts, whatever unit the sensors report in), plus how much of the day's solar the house used itself. The energy dialog draws the curve and splits the day's totals by it.",
        responses: {
          200: {
            description: "Today's power.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EnergyTodayResponse" },
              },
            },
          },
          503: {
            description: "HA_TOKEN or energy entities not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          500: {
            description: "Failed to fetch from Home Assistant.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/energy/monthly": {
      get: {
        tags: ["Energy"],
        operationId: "getEnergyMonthly",
        summary: "Get daily energy totals for a month",
        description:
          "Returns one entry per day from the 1st through today (current month) or the full month (past months). Each entry includes daily production/consumption and running totals for the month. Uses Home Assistant long-term statistics.",
        parameters: [
          {
            name: "month",
            in: "query",
            required: false,
            description: "Month to query in YYYY-MM format. Defaults to the current month.",
            schema: { type: "string", example: "2026-04" },
          },
        ],
        responses: {
          200: {
            description: "Nivo line series: production, consumption, runningProduction, runningConsumption (kWh), plus temperature (daily mean outdoor temp) when a temperature entity is configured. Each point x is YYYY-MM-DD, y is null if no statistics recorded for that day.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/NivoSeries" },
                },
              },
            },
          },
          400: {
            description: "Invalid month parameter.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          503: {
            description: "HA_TOKEN or energy entities not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          500: {
            description: "Failed to fetch from Home Assistant.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/energy/yearly": {
      get: {
        tags: ["Energy"],
        operationId: "getEnergyYearly",
        summary: "Get monthly energy totals for a year",
        description:
          "Returns one entry per month from January through the current month (current year) or the full year (past years). Daily long-term statistics are summed per month; each entry includes monthly production/consumption and running totals for the year. Uses Home Assistant long-term statistics.",
        parameters: [
          {
            name: "year",
            in: "query",
            required: false,
            description: "Year to query in YYYY format. Defaults to the current year.",
            schema: { type: "integer", example: 2026 },
          },
        ],
        responses: {
          200: {
            description: "Nivo line series: production, consumption, runningProduction, runningConsumption (kWh), plus temperature (monthly average of daily mean outdoor temps) when a temperature entity is configured. Each point x is YYYY-MM, y is null if no statistics recorded for that month.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/NivoSeries" },
                },
              },
            },
          },
          400: {
            description: "Invalid year parameter.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          503: {
            description: "HA_TOKEN or energy entities not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          500: {
            description: "Failed to fetch from Home Assistant.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/assist/config": {
      get: {
        tags: ["Assist"],
        operationId: "getAssistConfig",
        summary: "Resolve the configured Assist pipeline",
        description:
          "Resolves the `assist_pipeline_id` option (or Home Assistant's preferred pipeline when it is blank) to a pipeline name and its speech-to-text, conversation and text-to-speech engines. Returns `enabled: false` with an `error` of `unknown_pipeline` or `ha_unreachable` when the mic button should stay hidden. Cached for 60 seconds.",
        responses: {
          200: {
            description: "Resolved pipeline, or the reason voice is unavailable.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssistConfigResponse" },
              },
            },
          },
        },
      },
    },
    "/api/assist/tts/{id}": {
      get: {
        tags: ["Assist"],
        operationId: "getAssistTts",
        summary: "Stream the spoken reply for a completed turn",
        description:
          "Proxies the Piper audio for one reply from Home Assistant so the panel plays it from this addon's own origin — fetching it from Home Assistant directly would be blocked as mixed content. The id is minted server-side when the pipeline reports its audio; the client never supplies a URL. Ids expire two minutes after they are issued.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "Opaque id from the `tts-end` assist event.",
          },
        ],
        responses: {
          200: {
            description: "Audio stream.",
            content: { "audio/mpeg": { schema: { type: "string", format: "binary" } } },
          },
          404: {
            description: "Unknown or expired audio id.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          502: {
            description: "Home Assistant refused the audio request.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/circuits": {
      get: {
        tags: ["Energy"],
        operationId: "getCircuits",
        summary: "Get live per-circuit power breakdown",
        description:
          "Returns whole-home (main) and unmonitored (balance) live wattage plus a per-circuit breakdown from the Emporia Vue monitor, sorted by current watts descending. Read from the live Home Assistant state cache.",
        responses: {
          200: {
            description: "Live circuit power data.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CircuitsResponse" },
              },
            },
          },
          503: {
            description: "HA_TOKEN or circuit entities not configured.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/change/{view}": {
      get: {
        tags: ["Views"],
        operationId: "changeView",
        summary: "Broadcast a view change",
        description:
          "Emits a `change_view` Socket.IO event to all connected clients using the provided view identifier.",
        parameters: [
          {
            name: "view",
            in: "path",
            required: true,
            description: "The next view name to broadcast to clients.",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "The view change was broadcast successfully.",
          },
        },
      },
    },
    "/videos/{file}": {
      get: {
        tags: ["Videos"],
        operationId: "getVideoFile",
        summary: "Serve a video file",
        parameters: [
          {
            name: "file",
            in: "path",
            required: true,
            description: "A filename from the videos directory.",
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "The requested video file.",
            content: {
              "application/octet-stream": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          404: {
            description: "The requested video file was not found.",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ApiStatus: {
        type: "object",
        required: ["ok", "message"],
        properties: {
          ok: {
            type: "boolean",
            example: true,
          },
          message: {
            type: "string",
            example: "API is running",
          },
        },
      },
      ConnectionInfo: {
        type: "object",
        required: ["client", "server", "homeAssistant"],
        properties: {
          client: {
            type: "object",
            properties: {
              address: { type: "string", nullable: true, example: "10.0.0.42" },
            },
          },
          server: {
            type: "object",
            properties: {
              hostname: { type: "string", example: "homeassistant" },
              addresses: { type: "array", items: { type: "string" }, example: ["10.0.0.10"] },
              version: { type: "string", example: "0.71.0" },
              uptimeSeconds: { type: "integer", example: 86400 },
            },
          },
          homeAssistant: {
            type: "object",
            properties: {
              host: { type: "string", example: "supervisor" },
              connected: { type: "boolean", example: true },
            },
          },
        },
      },
      VideoList: {
        type: "array",
        items: {
          type: "string",
          example: "demo.mp4",
        },
      },
      ForecastPeriod: {
        type: "object",
        properties: {
          datetime: { type: "string", format: "date-time", example: "2026-04-26T15:00:00+00:00" },
          temperature: { type: "number", example: 68 },
          templow: { type: "number", nullable: true, example: 54 },
          condition: { type: "string", example: "partlycloudy" },
          precipitation: { type: "number", nullable: true, example: 0 },
          precipitationProbability: { type: "number", nullable: true, example: 20 },
          windSpeed: { type: "number", nullable: true, example: 10 },
          windBearing: { type: "number", nullable: true, example: 180 },
        },
      },
      WeatherResponse: {
        type: "object",
        properties: {
          state: { type: "string", example: "partlycloudy" },
          temperature: { type: "number", example: 68 },
          temperatureUnit: { type: "string", example: "°F" },
          humidity: { type: "number", example: 55 },
          windSpeed: { type: "number", example: 10 },
          windBearing: { type: "number", example: 180 },
          pressure: { type: "number", example: 30.1 },
          visibility: { type: "number", example: 10 },
          forecast: {
            type: "array",
            description: "Forecast periods from the entity's `forecast` attribute (up to 8).",
            items: { $ref: "#/components/schemas/ForecastPeriod" },
          },
          forecastDaily: {
            type: "array",
            description: "Hourly forecast from the weather.get_forecasts service (up to 8).",
            items: { $ref: "#/components/schemas/ForecastPeriod" },
          },
        },
      },
      HomeWeatherResponse: {
        type: "object",
        properties: {
          state: { type: "string", example: "partlycloudy" },
          temperature: { type: "number", example: 68 },
          temperatureUnit: { type: "string", example: "°F" },
          humidity: { type: "number", example: 55 },
          forecast: {
            type: "array",
            description: "Hourly forecast (up to 8 periods, from the current hour).",
            items: { $ref: "#/components/schemas/ForecastPeriod" },
          },
          forecastDaily: {
            type: "array",
            description: "Daily forecast (up to 10 days, from today): temperature is the high, templow the low.",
            items: { $ref: "#/components/schemas/ForecastPeriod" },
          },
        },
      },
      Album: {
        type: "object",
        properties: {
          id: { type: "string" },
          albumName: { type: "string" },
          assetCount: { type: "number" },
          thumbnailAssetId: { type: "string", nullable: true },
        },
      },
      AlbumDetail: {
        type: "object",
        properties: {
          id: { type: "string" },
          albumName: { type: "string" },
          assets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                createdAt: { type: "string" },
              },
            },
          },
        },
      },
      EnergyResponse: {
        type: "object",
        properties: {
          production: { type: "number", example: 18.4 },
          productionUnit: { type: "string", example: "kWh" },
          consumption: { type: "number", example: 22.1 },
          consumptionUnit: { type: "string", example: "kWh" },
          currentProduction: { type: "number", example: 3200 },
          currentProductionUnit: { type: "string", example: "W" },
          currentConsumption: { type: "number", example: 1850 },
          currentConsumptionUnit: { type: "string", example: "W" },
        },
      },
      EnergyTodayPoint: {
        type: "object",
        properties: {
          time: { type: "string", format: "date-time", description: "The quarter hour's start." },
          production: { type: "number", nullable: true, example: 6240, description: "Mean solar production, W." },
          consumption: { type: "number", nullable: true, example: 1310, description: "Mean home consumption, W." },
        },
      },
      EnergyTodayResponse: {
        type: "object",
        properties: {
          start: { type: "string", format: "date-time", description: "Local midnight today." },
          end: { type: "string", format: "date-time", description: "Local midnight tomorrow." },
          points: {
            type: "array",
            description: "One per quarter hour with statistics, oldest first.",
            items: { $ref: "#/components/schemas/EnergyTodayPoint" },
          },
          selfConsumed: {
            type: "number",
            nullable: true,
            example: 6.2,
            description: "kWh of today's solar the house used itself (the smaller of production and consumption in each 5-minute slot). Null without statistics.",
          },
        },
      },
      Circuit: {
        type: "object",
        properties: {
          name: { type: "string", example: "Heat Pump 1" },
          watts: { type: "number", nullable: true, example: 712.2 },
          kwhToday: { type: "number", nullable: true, example: 4.3 },
        },
      },
      CircuitsResponse: {
        type: "object",
        properties: {
          totalWatts: { type: "number", nullable: true, example: 2181.3 },
          balanceWatts: { type: "number", nullable: true, example: 866.9 },
          circuits: {
            type: "array",
            items: { $ref: "#/components/schemas/Circuit" },
          },
        },
      },
      NivoPoint: {
        type: "object",
        properties: {
          x: { type: "string", format: "date", example: "2026-04-15" },
          y: { type: "number", nullable: true, example: 12.34 },
        },
      },
      NivoSeries: {
        type: "object",
        properties: {
          id: {
            type: "string",
            enum: ["production", "consumption", "runningProduction", "runningConsumption", "temperature"],
            example: "production",
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/NivoPoint" },
          },
        },
      },
      AssistConfigResponse: {
        type: "object",
        required: ["enabled"],
        properties: {
          enabled: { type: "boolean", example: true },
          error: {
            type: "string",
            enum: ["unknown_pipeline", "ha_unreachable"],
            description: "Present only when enabled is false.",
          },
          pipelineId: { type: "string", example: "01kpppasx45waqrbmh7syb8vhr" },
          name: { type: "string", example: "Jarvis" },
          language: { type: "string", example: "en" },
          sttEngine: { type: "string", example: "stt.faster_whisper" },
          ttsEngine: { type: "string", example: "tts.piper" },
          conversationEngine: { type: "string", example: "conversation.jarvis" },
          usingPreferred: {
            type: "boolean",
            description: "True when assist_pipeline_id is blank and HA's preferred pipeline was used.",
          },
          speaker: {
            type: "string",
            nullable: true,
            description: "Optional media_player the reply is also played on.",
          },
          configuredId: {
            type: "string",
            description: "The unresolved option value, when it matches no pipeline.",
          },
          available: {
            type: "array",
            description: "Pipelines to choose from, when the configured id is unknown.",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
            example: "Unable to list videos",
          },
        },
      },
    },
  },
};

export function renderSwaggerUiHtml({
  title = "Frame14 API Docs",
  specUrl = "/api/docs/openapi.json",
} = {}) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="/api/docs/swagger-ui.css" />
    <style>
      html {
        box-sizing: border-box;
        overflow-y: scroll;
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      body {
        margin: 0;
        background: #f3f5f8;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs/swagger-ui-bundle.js"></script>
    <script src="/api/docs/swagger-ui-standalone-preset.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: "#swagger-ui",
        deepLinking: true,
        docExpansion: "list",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      });
    </script>
  </body>
</html>`;
}
