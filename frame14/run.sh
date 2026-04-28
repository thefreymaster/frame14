#!/usr/bin/with-contenv bashio

export PORT=$(bashio::config 'port')
export HA_URL=$(bashio::config 'ha_url')
export HA_TOKEN=$(bashio::config 'ha_token')
export IMMICH_URL=$(bashio::config 'immich_url')
export IMMICH_API_KEY=$(bashio::config 'immich_api_key')

bashio::log.info "Starting OLED Dashboard on port ${PORT}"

node /app/index.js
