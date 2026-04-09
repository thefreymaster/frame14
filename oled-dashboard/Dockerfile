FROM node:20-alpine
LABEL \
    io.hass.name="OLED Dashboard" \
    io.hass.description="OLED-optimized home dashboard with clock, weather, and Immich photo slideshow" \
    io.hass.type="addon" \
    io.hass.arch="aarch64|amd64|armhf|armv7"

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY dist ./dist
COPY index.js config.js openapi.js ha-motion.js ./
COPY routes ./routes

CMD ["node", "index.js"]
