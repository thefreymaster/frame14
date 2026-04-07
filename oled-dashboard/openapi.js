export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "OLED Dashboard API",
    version: "1.0.0",
    description:
      "REST API for the OLED Dashboard server. Connected Socket.IO clients can emit `change` and receive `change_view` events to synchronize view changes.",
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
      WeatherResponse: {
        type: "object",
        properties: {
          state: { type: "string", example: "partlycloudy" },
          temperature: { type: "number", example: 68 },
          temperatureUnit: { type: "string", example: "°F" },
          humidity: { type: "number", example: 55 },
          windSpeed: { type: "string", example: "10 mph" },
          forecast: {
            type: "array",
            items: {
              type: "object",
              properties: {
                datetime: { type: "string" },
                temperature: { type: "number" },
                condition: { type: "string" },
                precipitationProbability: { type: "number" },
              },
            },
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
  title = "OLED Dashboard API Docs",
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
