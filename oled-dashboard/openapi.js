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
        summary: "Get current weather and hourly forecast for HomeOverview",
        description:
          "Fetches the configured weather entity from Home Assistant plus an hourly forecast via the weather.get_forecasts service. Returns current state, temperature, humidity, and the next 8 hourly forecast periods.",
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
            description: "Album with image assets.",
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
        parameters: [{ name: "assetId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "JPEG thumbnail image.", content: { "image/jpeg": {} } },
          503: { description: "Immich not configured.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
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
        description: "Returns today's production and consumption totals plus current live wattage from Home Assistant.",
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
            description: "Four Nivo line series: production, consumption, runningProduction, runningConsumption. Each point x is YYYY-MM-DD, y is kWh (null if no statistics recorded for that day).",
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
          humidity: { type: "number", example: 55 },
          forecast: {
            type: "array",
            description: "Hourly forecast (up to 8 periods).",
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
            enum: ["production", "consumption", "runningProduction", "runningConsumption"],
            example: "production",
          },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/NivoPoint" },
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
