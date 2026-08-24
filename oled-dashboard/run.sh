#!/usr/bin/with-contenv bashio

export PORT=$(bashio::config 'port')
export HA_URL=$(bashio::config 'ha_url')
export HA_TOKEN=$(bashio::config 'ha_token')
export IMMICH_URL=$(bashio::config 'immich_url')
export IMMICH_API_KEY=$(bashio::config 'immich_api_key')

# Optional — bashio::config prints "null" when unset, so only export when set.
if bashio::config.has_value 'plex_url'; then
  export PLEX_URL=$(bashio::config 'plex_url')
fi
if bashio::config.has_value 'plex_token'; then
  export PLEX_TOKEN=$(bashio::config 'plex_token')
fi

bashio::log.info "Starting OLED Dashboard on port ${PORT}"

node /app/index.js
