FROM node:24.7.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=512"
RUN npm run build

FROM node:24.7.0-alpine
LABEL \
    io.hass.name="OLED Dashboard" \
    io.hass.description="OLED-optimized home dashboard with clock, weather, and Immich photo slideshow" \
    io.hass.type="addon" \
    io.hass.arch="aarch64|amd64|armhf|armv7"

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY index.js config.js entities.js openapi.js ha-socket.js frame14.json ./
COPY routes ./routes

CMD ["node", "index.js"]
