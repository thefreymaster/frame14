#!/usr/bin/env node
// A stand-in Home Assistant for the tests: its REST API and WebSocket on one
// port, with a house's worth of states (a snapshot of the real one, plus a
// running printer and a cleaning vacuum so every card has something to show),
// the area / device / entity registries for the lights by room, forecasts,
// calendars, history and statistics. Service calls change the states and are
// pushed back as state_changed events, as Home Assistant does.
//
// As a module: `const stub = await createStub({ port })` — `stub.setState`,
// `stub.pushEvent`, `stub.reset()`, `stub.close()`. As a command (Playwright's
// webServer, `npm run stub`): `STUB_PORT=8310 node tests/stub/stub-ha.mjs`.
//
// Test-only endpoints, for a test to steer it:
//   POST /_stub/state    {"entity_id", "state", "attributes"} — set a state
//   POST /_stub/service  {"delay_ms", "fail": {"light.x": "why"}, "silent": [ids]}
//                        — slow, refuse, or swallow service calls
//   POST /_stub/registry {"entity_id", "area_id"} — move an entity to an area
//   POST /_stub/reset    — every state, registry and behaviour as at start
import http from "node:http";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

/** The names Home Assistant gives the entities in the stub's house. */
export const STUB = {
  printer: "sensor.a1_03919c442700723",
  envoy: "sensor.envoy_482518016321",
  h2s: "h2s_0938aj622701347",
  vacuum: "roborock_q5_pro",
  addonUpdate: "update.frame14_update",
};

// A 1x1 JPEG, for the camera stills and the printer camera's frames.
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

function coverSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e8e8e8"/><g transform="translate(100 105)"><path d="M0 -60 L52 -30 L52 30 L0 60 L-52 30 L-52 -30 Z" fill="#f28c28"/><path d="M0 -60 L52 -30 L0 0 L-52 -30 Z" fill="#ffb361"/><path d="M0 0 L52 -30 L52 30 L0 60 Z" fill="#c96a14"/></g></svg>`;
}
function mapSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320"><rect width="400" height="320" fill="none"/><path d="M40 40 H250 V120 H360 V280 H140 V200 H40 Z" fill="#6d9eeb" opacity=".55"/><path d="M60 60 H230 V180 H60 Z" fill="#93c47d" opacity=".7"/><path d="M160 140 H340 V260 H160 Z" fill="#ffd966" opacity=".7"/><circle cx="320" cy="240" r="9" fill="#fff"/></svg>`;
}

export function createStub({ port = 8310, host = "127.0.0.1", log = () => {} } = {}) {
  const now = new Date();
  const iso = (d) => d.toISOString();
  const inMin = (m) => new Date(now.getTime() + m * 60_000);

  const S = (entity_id, state, attributes = {}) => ({
    entity_id,
    state: String(state),
    attributes,
    last_changed: iso(inMin(-30)),
    last_updated: iso(inMin(-1)),
    context: { id: "stub" },
  });

  const light = (id, name, on, extra = {}) =>
    S(id, on ? "on" : "off", {
      friendly_name: name,
      supported_color_modes: ["color_temp", "xy"],
      color_mode: on ? "color_temp" : null,
      brightness: on ? 255 : null,
      color_temp_kelvin: on ? 2800 : null,
      min_color_temp_kelvin: 2000,
      max_color_temp_kelvin: 6535,
      rgb_color: on ? [255, 171, 96] : null,
      ...extra,
    });

  const climate = (id, name, state, cur, target, extra = {}) =>
    S(id, state, {
      friendly_name: name,
      hvac_modes: ["off", "auto", "cool", "dry", "fan_only", "heat"],
      min_temp: 47,
      max_temp: 86,
      target_temp_step: 1,
      fan_modes: ["auto", "low", "medium", "high", "turbo"],
      current_temperature: cur,
      temperature: target,
      fan_mode: "auto",
      supported_features: 441,
      ...extra,
    });

  const power = (id, name, w) =>
    S(id, w, {
      friendly_name: name,
      unit_of_measurement: "W",
      device_class: "power",
      state_class: "measurement",
    });

  const { printer: P, envoy: E, h2s: HN, vacuum: V } = STUB;
  const H = `sensor.${HN}`;

  const initialStates = () => [
    light("light.living_room", "Living Room", true, { icon: "mdi:sofa", brightness: 204 }),
    light("light.kitchen_main_lights", "Kitchen Main Lights", false),
    light("light.living_room_fireplace", "Kitchen Island Lights", false, { icon: "mdi:chandelier" }),
    light("light.backyard", "Backyard", false, { icon: "mdi:grill" }),
    light("light.lady_lamp", "Reading Nook", false),
    light("light.kitchen_cabinet_lights", "Kitchen Cabinet Lights", true, { brightness: 89 }),
    S("switch.sonoff_1001816bdb", "unavailable", { friendly_name: "Christmas Tree", icon: "mdi:pine-tree" }),
    light("light.dining_room_chandelier", "Dining Room Chandelier", false),
    light("light.front_yard", "Front Yard", false),
    S("switch.ihome_smartplug_05b4df_outlet", "off", { friendly_name: "Smart Plug" }),
    light("light.front_porch", "Front Porch", false, { icon: "mdi:mailbox" }),
    light("light.hue_ambiance_lamp_1", "Evans Lamp", false),
    light("light.lizs_lamp", "Liz’s Lamp", false),
    light("light.movie_theater", "Movie Theater", true, { icon: "mdi:theater" }),
    light("light.evans_office", "Evan’s Office", true, { icon: "mdi:controller" }),
    light("light.aidens_hatch_light", "Kid's Hatch Light", true, {
      supported_color_modes: ["rgb"], color_mode: "rgb", brightness: 128, rgb_color: [0, 0, 255],
    }),
    light("light.basement_2", "Basement", false),
    light("light.workshop", "Workshop", false),
    light("light.living_room_floor_lamp", "Floor Lamp", false),
    light("light.kitchen_plug_indicator", "Kitchen Plug Indicator", true),

    S("weather.systems_weatherkit", "cloudy", {
      friendly_name: "weatherkit",
      temperature: 74, apparent_temperature: 70, dew_point: 62, temperature_unit: "°F",
      humidity: 65, cloud_coverage: 100, uv_index: 3, pressure: 29.75, pressure_unit: "inHg",
      wind_bearing: 275, wind_gust_speed: 20.51, wind_speed: 10.51, wind_speed_unit: "mph",
      visibility: 16.51, visibility_unit: "mi", precipitation_unit: "in", supported_features: 3,
    }),
    S("sensor.openweathermap_temperature", 74, { friendly_name: "OpenWeatherMap Temperature", unit_of_measurement: "°F", device_class: "temperature" }),

    climate("climate.samsung_airconditioner_1", "Localthings 1st FLR AC", "heat", 64, 70, { hvac_action: "heating", current_humidity: 46 }),
    climate("climate.samsung_airconditioner_2", "Localthings 2nd FLR AC", "off", 68, 68),
    climate("climate.samsung_airconditioner_3rd_flr", "Localthings 3rd FLR AC", "cool", 75, 72, { fan_mode: "turbo", hvac_action: "cooling" }),
    climate("climate.samsung_airconditioner_3", "Localthings Master AC", "off", 68, 68),

    S(`${E}_current_power_production`, "0.903", { unit_of_measurement: "kW", device_class: "power", friendly_name: "Current power production" }),
    S(`${E}_current_power_consumption`, "1.184", { unit_of_measurement: "kW", device_class: "power", friendly_name: "Current power consumption" }),
    S(`${E}_energy_production_today`, "10.98", { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" }),
    S(`${E}_energy_consumption_today`, "18.84", { unit_of_measurement: "kWh", device_class: "energy", state_class: "total_increasing" }),
    S(`${E}_lifetime_energy_production`, "54.980394", { unit_of_measurement: "MWh", device_class: "energy", state_class: "total_increasing" }),
    S(`${E}_lifetime_energy_consumption`, "78.841422", { unit_of_measurement: "MWh", device_class: "energy", state_class: "total_increasing" }),

    power("sensor.vueenergymonitor_power_minute_average", "VueEnergyMonitor", "1220.07"),
    power("sensor.balance_power_minute_average", "Balance", "384.99"),
    power("sensor.ac1_power_minute_average", "Heat Pump1", "412.0"),
    power("sensor.ac2_power_minute_average", "Heat Pump2", "0.0"),
    power("sensor.ac3_power_minute_average", "Kitchen", "30.97"),
    power("sensor.ac4_power_minute_average", "Fridge", "148.0"),
    power("sensor.living_room_power_minute_average", "Living Room", "56.0"),
    power("sensor.workshop_basement_power_minute_average", "Workshop/Basement", "112.51"),
    S("sensor.ac1_energy_today", "3.2", { unit_of_measurement: "kWh", device_class: "energy" }),

    S("vacuum.roborock_q5_pro", "cleaning", {
      friendly_name: "Robovac", fan_speed: "max_plus", battery_level: 81, cleaning_progress: 42,
      fan_speed_list: ["quiet", "balanced", "turbo", "max", "max_plus", "gentle"], supported_features: 30524,
    }),
    S("fan.living_room_ceiling_fan", "on", { friendly_name: "Living Room Ceiling Fan", percentage: 50, percentage_step: 25, supported_features: 49 }),
    S("fan.aidens_fan", "off", { friendly_name: "Guest Room Fan", percentage: 50, percentage_step: 25, preset_mode: "normal", preset_modes: ["normal", "natural", "sleep", "auto"], supported_features: 59 }),
    S("media_player.plex_plex_for_apple_tv_apple_tv", "idle", { friendly_name: "Plex (Apple TV)", supported_features: 131584 }),
    S("media_player.living_room_tv", "on", { friendly_name: "Living Room TV", supported_features: 23997, volume_level: 0.18, is_volume_muted: false, source: "Apple TV", source_list: ["Apple TV", "HDMI 1", "HDMI 2", "Live TV", "Netflix"], app_name: "Apple TV" }),

    S("sensor.teamtracker_fsu", "PRE", {
      friendly_name: "TeamTracker - FSU", sport: "football", league: "NCAAF",
      team_abbr: "FSU", opponent_abbr: "MIA", event_name: "FSU @ MIA",
      date: iso(inMin(5 * 60)), kickoff_in: "in 5 hours",
      venue: "Hard Rock Stadium", location: "Miami Gardens, FL, USA", tv_network: "ESPN/Disney+",
      odds: "MIA -21.5", overunder: 56.5,
      team_name: "Florida St", team_long_name: "Florida State Seminoles", team_id: "52",
      team_record: "3-3", team_rank: null, team_homeaway: "away",
      team_logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/52.png", team_colors: ["#782f40", "#ceb888"],
      team_score: "0", team_win_probability: null, team_winner: null, team_timeouts: null,
      opponent_name: "Miami", opponent_long_name: "Miami Hurricanes", opponent_id: "2390",
      opponent_record: "5-0", opponent_rank: 3, opponent_homeaway: "home",
      opponent_logo: "https://a.espncdn.com/i/teamlogos/ncaa/500/2390.png", opponent_colors: ["#f47423", "#035131"],
      opponent_score: "0", opponent_win_probability: null, opponent_winner: null, opponent_timeouts: null,
      quarter: 0, clock: "7:00 PM EDT", possession: null, last_play: null, down_distance_text: null,
    }),
    S("binary_sensor.front_porch_person_detected", "off", { friendly_name: "Front Porch Person detected" }),
    S("binary_sensor.1_1_1_1", "on", { friendly_name: "1.1.1.1" }),
    S("binary_sensor.kitchen_motion_sensor_motion", "off", { friendly_name: "Kitchen motion" }),
    S("camera.front_porch_high", "idle", { friendly_name: "Front Porch High" }),
    S("camera.front_porch_rtsp", "idle", { friendly_name: "Front Porch RTSP" }),
    S("input_select.oledos_route", "home", { options: ["home", "clock", "digital", "blank", "photos"] }),
    S("input_select.smart_frame_album", "e38508c9-f876-4afb-a248-caca8efb0766", { options: [] }),

    S(`${P}_print_status`, "running", { friendly_name: "A1 Print status" }),
    S(`${P}_print_progress`, "63", { unit_of_measurement: "%" }),
    S(`${P}_remaining_time`, "1.4", { unit_of_measurement: "h" }),
    S(`${P}_task_name`, "Benchy_0.2mm_PLA", {}),
    S(`${P}_nozzle_temperature`, "219.8", { unit_of_measurement: "°C" }),
    S(`${P}_nozzle_target_temperature`, "220", { unit_of_measurement: "°C" }),
    S(`${P}_bed_temperature`, "64.6", { unit_of_measurement: "°C" }),
    S(`${P}_bed_target_temperature`, "65", { unit_of_measurement: "°C" }),
    S(`${P}_current_layer`, "142", {}),
    S(`${P}_total_layer_count`, "226", {}),
    S(`${P}_current_stage`, "printing", {}),
    S(`${P}_end_time`, iso(inMin(84)), { device_class: "timestamp" }),
    S(`${P}_start_time`, iso(inMin(-150)), { device_class: "timestamp" }),
    S(`${P}_print_length`, "11.2", { unit_of_measurement: "m" }),
    S(`${P}_print_weight`, "33.6", { unit_of_measurement: "g" }),
    S(`${P}_active_tray`, "PLA Basic", { color: "#1f6feb", name: "PLA Basic", type: "PLA" }),
    S(`${P}_speed_profile`, "standard", {}),
    S(`${P}_gcode_filename`, "Benchy_0.2mm_PLA.gcode", {}),
    S(`binary_sensor.a1_03919c442700723_hms_errors`, "off", { device_class: "problem" }),
    S(`image.a1_03919c442700723_cover_image`, iso(inMin(-40)), { entity_picture: `/api/image_proxy/image.a1_03919c442700723_cover_image?token=x` }),
    S(`camera.a1_03919c442700723_camera`, "idle", { supported_features: 0, entity_picture: `/api/camera_proxy/camera.a1_03919c442700723_camera?token=x` }),
    S(`button.a1_03919c442700723_pause_printing`, "unknown", {}),
    S(`button.a1_03919c442700723_resume_printing`, "unknown", {}),
    S(`button.a1_03919c442700723_stop_printing`, "unknown", {}),
    S("light.a1_03919c442700723_chamber_light", "off", { friendly_name: "A1 Chamber Light", supported_color_modes: ["onoff"] }),

    // Bambuddy's H2S, mid-print.
    S(`${H}_status`, "RUNNING", { friendly_name: "H2S Status" }),
    S(`binary_sensor.${HN}_online`, "on", { device_class: "connectivity" }),
    S(`binary_sensor.${HN}_hms_errors`, "off", { device_class: "problem" }),
    S(`${H}_progress`, "42.0", { unit_of_measurement: "%" }),
    S(`${H}_remaining_time`, "73", { unit_of_measurement: "min", device_class: "duration" }),
    S(`${H}_current_print`, "EmergencyKeyRing", {}),
    S(`${H}_current_layer`, "9", {}),
    S(`${H}_total_layers`, "20", {}),
    S(`${H}_nozzle_temperature`, "428.0", { unit_of_measurement: "°F", device_class: "temperature" }),
    S(`${H}_nozzle_target_temperature`, "428.0", { unit_of_measurement: "°F", device_class: "temperature" }),
    S(`${H}_bed_temperature`, "149.2", { unit_of_measurement: "°F", device_class: "temperature" }),
    S(`${H}_bed_target_temperature`, "149.0", { unit_of_measurement: "°F", device_class: "temperature" }),
    S(`image.${HN}_cover`, iso(inMin(-40)), { entity_picture: `/api/image_proxy/image.${HN}_cover?token=x` }),
    S(`camera.${HN}_camera`, "idle", { supported_features: 0, entity_picture: `/api/camera_proxy/camera.${HN}_camera?token=x` }),
    S(`button.${HN}_pause_print`, "unknown", {}),
    S(`button.${HN}_resume_print`, "unknown", {}),
    S(`button.${HN}_stop_print`, "unknown", {}),
    S(`switch.${HN}_chamber_light`, "off", { friendly_name: "H2S Chamber Light", icon: "mdi:lightbulb" }),

    // The Supervisor's update entities: Core, OS, and the add-on's own.
    S("update.home_assistant_core_update", "off", { friendly_name: "Home Assistant Core Update", installed_version: "2026.10.3", latest_version: "2026.10.3", title: "Home Assistant Core", device_class: "firmware" }),
    S(STUB.addonUpdate, "off", { friendly_name: "Frame14 Update", installed_version: "0.0.0", latest_version: "0.0.0", title: "Frame14", release_url: "https://github.com/thefreymaster/frame14/releases" }),

    // Roborock's sensors for the vacuum.
    S(`sensor.${V}_status`, "segment_cleaning", { device_class: "enum" }),
    S(`sensor.${V}_battery`, "81", { unit_of_measurement: "%", device_class: "battery" }),
    S(`binary_sensor.${V}_charging`, "off", { device_class: "battery_charging" }),
    S(`sensor.${V}_vacuum_error`, "none", { device_class: "enum" }),
    S(`sensor.${V}_cleaning_progress`, "42", { unit_of_measurement: "%" }),
    S(`sensor.${V}_cleaning_area`, "12.3", { unit_of_measurement: "m²" }),
    S(`sensor.${V}_cleaning_time`, "18.5", { unit_of_measurement: "min", device_class: "duration" }),
    S(`sensor.${V}_last_clean_begin`, iso(inMin(-19)), { device_class: "timestamp" }),
    S(`sensor.${V}_main_brush_time_left`, "65.17", { unit_of_measurement: "h", device_class: "duration" }),
    S(`sensor.${V}_side_brush_time_left`, "-34.83", { unit_of_measurement: "h", device_class: "duration" }),
    S(`sensor.${V}_filter_time_left`, "12.96", { unit_of_measurement: "h", device_class: "duration" }),
    S(`sensor.${V}_sensor_time_left`, "-31.86", { unit_of_measurement: "h", device_class: "duration" }),
    S(`image.${V}_first_floor`, iso(inMin(-2)), { friendly_name: "Roborock Q5 Pro First Floor", entity_picture: `/api/image_proxy/image.${V}_first_floor?token=x` }),
  ];

  const states = new Map(initialStates().map((s) => [s.entity_id, s]));

  // The registries (the lights by room): HA's areas, one device in an area,
  // and every light / switch with its area, as config/*_registry/list answer.
  const initialAreas = () =>
    [
      ["living_room", "Living Room"], ["kitchen", "Kitchen"], ["dining_room", "Dining Room"], ["outside", "Outside"],
      ["basement", "Basement"], ["evans_office", "Evan's Office"], ["primary_bedroom", "Primary Bedroom"], ["aidens_room", "Aiden's Room"],
    ].map(([area_id, name]) => ({ area_id, name, picture: null, icon: null, aliases: [] }));
  const DEVICES = [{ id: "dev_porch", area_id: "outside", name: "Porch Fixture" }];
  const ENTITY_AREAS = {
    "light.living_room": "living_room", "light.living_room_fireplace": "living_room", "light.lady_lamp": "living_room",
    "light.living_room_floor_lamp": "living_room", "switch.sonoff_1001816bdb": "living_room",
    "light.kitchen_main_lights": "kitchen", "light.kitchen_cabinet_lights": "kitchen", "light.kitchen_plug_indicator": "kitchen",
    "light.dining_room_chandelier": "dining_room",
    "light.backyard": "outside", "light.front_yard": "outside",
    "light.basement_2": "basement", "light.workshop": "basement", "light.movie_theater": "basement",
    "light.evans_office": "evans_office", "light.hue_ambiance_lamp_1": "primary_bedroom", "light.lizs_lamp": "primary_bedroom",
    "light.aidens_hatch_light": "aidens_room",
  };
  const initialEntityRegistry = () =>
    [...states.keys()].filter((id) => /^(light|switch)\./.test(id)).map((entity_id) => ({
      entity_id,
      area_id: entity_id === "light.front_porch" ? null : ENTITY_AREAS[entity_id] ?? null,
      device_id: entity_id === "light.front_porch" ? "dev_porch" : null,
      disabled_by: null, hidden_by: null,
      entity_category: entity_id === "light.kitchen_plug_indicator" ? "config" : null,
      name: null, original_name: states.get(entity_id).attributes.friendly_name, platform: "stub",
    }));
  let areas = initialAreas();
  let entityRegistry = initialEntityRegistry();

  const CONDITIONS = ["cloudy", "partlycloudy", "partlycloudy", "sunny", "clear-night", "clear-night", "rainy", "cloudy"];
  function forecast() {
    const base = new Date();
    base.setMinutes(0, 0, 0);
    return Array.from({ length: 24 }, (_, i) => ({
      datetime: iso(new Date(base.getTime() + (i + 1) * 3_600_000)),
      condition: CONDITIONS[i % CONDITIONS.length],
      temperature: Math.round(74 - i * 0.8 + Math.sin(i / 3) * 2),
      templow: 58,
      humidity: 60 + (i % 10),
      precipitation_probability: [0, 5, 10, 20, 40, 15, 5, 0][i % 8],
      precipitation: 0,
      wind_speed: 9 + (i % 5),
      wind_bearing: 270,
      cloud_coverage: 70,
      uv_index: Math.max(0, 3 - i),
      apparent_temperature: 72 - i * 0.8,
    }));
  }
  const DAILY_CONDITIONS = ["sunny", "partlycloudy", "cloudy", "rainy", "pouring", "partlycloudy", "sunny", "snowy-rainy", "cloudy", "sunny"];
  function dailyForecast() {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 10 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const high = Math.round(66 - i * 1.5 + Math.sin(i) * 5);
      return {
        datetime: iso(d),
        condition: DAILY_CONDITIONS[i],
        temperature: high,
        templow: high - 12 - (i % 3) * 3,
        precipitation_probability: [0, 10, 30, 70, 90, 20, 0, 40, 10, 0][i],
        precipitation: [0, 0, 0.1, 0.4, 1.2, 0, 0, 0.2, 0, 0][i],
        wind_speed: 8 + (i % 4),
        wind_bearing: 250,
      };
    });
  }

  function calendarEvents(calId) {
    const day = (offsetDays, h, m) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const allDay = (offsetDays) => day(offsetDays, 0, 0).toISOString().slice(0, 10);
    if (calId === "calendar.family") {
      return [
        { summary: "School pickup", start: { dateTime: iso(day(0, 15, 15)) }, end: { dateTime: iso(day(0, 15, 45)) } },
        { summary: "Soccer practice", start: { dateTime: iso(day(0, 17, 30)) }, end: { dateTime: iso(day(0, 19, 0)) } },
        { summary: "Dentist", start: { dateTime: iso(day(1, 9, 0)) }, end: { dateTime: iso(day(1, 10, 0)) } },
        { summary: "Trash day", start: { date: allDay(1) }, end: { date: allDay(2) } },
        { summary: "Grandma visiting", start: { date: allDay(3) }, end: { date: allDay(6) } },
        { summary: "Piano recital", start: { dateTime: iso(day(5, 16, 0)) }, end: { dateTime: iso(day(5, 17, 30)) } },
      ];
    }
    return [
      { summary: "Team standup", start: { dateTime: iso(day(0, 9, 30)) }, end: { dateTime: iso(day(0, 10, 0)) } },
      { summary: "Dinner with the Parkers", start: { dateTime: iso(day(1, 18, 30)) }, end: { dateTime: iso(day(1, 21, 0)) } },
    ];
  }

  // history/history_during_period: each climate entity's day as compressed
  // rows every ten minutes, the room drifting around its target.
  function history({ start_time, end_time, entity_ids = [] }) {
    const start = Date.parse(start_time);
    const end = end_time ? Date.parse(end_time) : Date.now();
    const out = {};
    for (const id of entity_ids) {
      const cur = states.get(id);
      if (!cur) { out[id] = []; continue; }
      const rows = [];
      const target = Number(cur.attributes.temperature) || 70;
      const mode = cur.state;
      for (let t = start, i = 0; t <= end && i < 200; t += 600e3, i++) {
        const h = (t - start) / 3600e3;
        const temp = target + 2.5 * Math.sin(h / 2.2 + id.length) + 0.8 * Math.sin(h * 1.7);
        const running = mode === "heat" ? temp < target - 0.8 : mode === "cool" ? temp > target + 0.8 : false;
        rows.push({
          s: mode,
          a: { ...cur.attributes, current_temperature: Math.round(temp * 10) / 10, hvac_action: running ? (mode === "heat" ? "heating" : "cooling") : mode === "off" ? "off" : "idle" },
          lu: t / 1000,
        });
      }
      out[id] = rows;
    }
    return out;
  }

  // recorder/statistics_during_period: climbing sums anchored to the entity's
  // reading now, so the energy routes' end-of-day differencing gives plausible
  // daily totals; 5-minute power means as a solar bell and a house curve.
  function statistics({ start_time, end_time, statistic_ids = [], period = "day" }) {
    const step = { "5minute": 300e3, hour: 3600e3, day: 86400e3, week: 7 * 86400e3, month: 30 * 86400e3 }[period] ?? 86400e3;
    const start = Date.parse(start_time);
    const end = end_time ? Date.parse(end_time) : Date.now();
    const out = {};
    for (const id of statistic_ids) {
      const rows = [];
      const isMwh = /lifetime/.test(id);
      const perDay = /production/.test(id) ? 18 : 26;
      const cur = Number(states.get(id)?.state) || (isMwh ? 50 : 1000);
      const valueAt = (t) => {
        const days = (Date.now() - t) / 86400e3;
        const wobble = Math.sin(t / 86400e3) * 0.15 * perDay;
        const kwh = days * perDay + wobble;
        return cur - (isMwh ? kwh / 1000 : kwh);
      };
      if (period === "5minute" && /current_power_(production|consumption)/.test(id)) {
        const solar = /production/.test(id);
        for (let t = start, i = 0; t < end && i < 2000; t += step, i++) {
          const d = new Date(t);
          const h = d.getHours() + d.getMinutes() / 60;
          const noise = Math.sin(t / 7e5) * Math.sin(t / 3.1e6);
          let w;
          if (solar) {
            const x = (h - 12.75) / 3.2;
            w = h < 7 || h > 18.3 ? 0 : 7600 * Math.exp(-x * x) * (1 - 0.35 * Math.max(0, noise));
          } else {
            w = 650 + 1400 * Math.exp(-(((h - 7.6) / 0.9) ** 2)) + 2100 * Math.exp(-(((h - 18.6) / 1.4) ** 2)) + 300 * (noise + 1);
          }
          rows.push({ start: t, end: t + step, mean: Math.round(w), min: Math.round(w * 0.8), max: Math.round(w * 1.2) });
        }
        out[id] = rows;
        continue;
      }
      for (let t = start, i = 0; t < end && i < 2000; t += step, i++) {
        const v = valueAt(Math.min(t + step, Date.now()));
        rows.push({ start: t, end: t + step, state: v, sum: v, change: valueAt(t + step) - valueAt(t), mean: 60 + Math.sin(i / 4) * 15, min: 50, max: 80 });
      }
      out[id] = rows;
    }
    return out;
  }

  // Service calls can be slowed, refused or swallowed (POST /_stub/service).
  let serviceDelayMs = 0;
  let failing = new Map();
  let silent = new Set();
  const sockets = new Set();

  function pushState(newState, oldState) {
    const msg = {
      type: "event",
      event: { event_type: "state_changed", data: { entity_id: newState.entity_id, old_state: oldState ?? null, new_state: newState } },
    };
    for (const s of sockets) if (s.subId != null) s.ws.send(JSON.stringify({ ...msg, id: s.subId }));
  }
  /** Any other subscribed event type (the registry events), to its own subscription. */
  function pushEvent(event_type, data) {
    const msg = { type: "event", event: { event_type, data, origin: "LOCAL", time_fired: iso(new Date()) } };
    for (const s of sockets) if (s.subs[event_type] != null) s.ws.send(JSON.stringify({ ...msg, id: s.subs[event_type] }));
  }
  function setState(entity_id, state, attributes) {
    const old = states.get(entity_id);
    const next = {
      ...(old ?? S(entity_id, state)),
      state: state != null ? String(state) : old?.state ?? "unknown",
      attributes: { ...(old?.attributes ?? {}), ...(attributes ?? {}) },
      last_updated: iso(new Date()),
    };
    if (old?.state !== next.state) next.last_changed = next.last_updated;
    states.set(entity_id, next);
    pushState(next, old);
    return next;
  }
  function applyService(domain, service, data = {}) {
    const ids = [].concat(data.entity_id ?? []);
    for (const id of ids) {
      const cur = states.get(id);
      if (!cur) continue;
      if (service === "toggle") setState(id, cur.state === "on" ? "off" : "on");
      else if (service === "turn_on" && domain === "light") {
        const a = {};
        if (cur.state !== "on" && cur.attributes.brightness == null) a.brightness = 255;
        if (data.brightness_pct != null) a.brightness = Math.round((data.brightness_pct / 100) * 255);
        if (data.color_temp_kelvin != null) {
          const k = data.color_temp_kelvin;
          a.color_mode = "color_temp";
          a.color_temp_kelvin = k;
          a.rgb_color = k <= 2400 ? [255, 152, 54] : k <= 3000 ? [255, 171, 96] : k <= 4500 ? [255, 209, 163] : [255, 244, 237];
        }
        if (data.rgb_color != null) {
          a.color_mode = cur.attributes.supported_color_modes?.includes("rgb") ? "rgb" : "xy";
          a.rgb_color = data.rgb_color;
          a.color_temp_kelvin = null;
        }
        if (cur.state !== "on" && !a.rgb_color && !cur.attributes.rgb_color) a.rgb_color = [255, 171, 96];
        setState(id, "on", a);
      }
      else if (service === "turn_on") setState(id, "on", data.percentage != null ? { percentage: data.percentage } : {});
      else if (service === "turn_off") setState(id, "off");
      else if (service === "set_temperature") setState(id, cur.state, { temperature: data.temperature });
      else if (service === "set_hvac_mode") setState(id, data.hvac_mode, { hvac_action: data.hvac_mode === "off" ? "off" : "idle" });
      else if (service === "set_fan_mode") setState(id, cur.state, { fan_mode: data.fan_mode });
      else if (service === "set_percentage") setState(id, data.percentage > 0 ? "on" : "off", { percentage: data.percentage });
      else if (service === "select_option") setState(id, data.option);
      else if (domain === "vacuum" && service === "start") setState(id, "cleaning");
      else if (domain === "vacuum" && service === "pause") setState(id, "paused");
      else if (domain === "vacuum" && service === "return_to_base") setState(id, "returning");
      else if (domain === "vacuum" && service === "set_fan_speed") setState(id, cur.state, { fan_speed: data.fan_speed });
      else if (domain === "button" && service === "press") {
        const h2s = `sensor.${HN}_status`;
        const a1 = `${P}_print_status`;
        const st = id.includes(HN) ? h2s : a1;
        const words = st === h2s ? { pause: "PAUSE", run: "RUNNING", stop: "FAILED" } : { pause: "pause", run: "running", stop: "failed" };
        if (/_pause_print/.test(id)) setState(st, words.pause);
        if (/_resume_print/.test(id)) setState(st, words.run);
        if (/_stop_print/.test(id)) setState(st, words.stop);
      }
    }
  }
  function reset() {
    const before = new Map(states);
    states.clear();
    for (const s of initialStates()) states.set(s.entity_id, s);
    // Every entity whose state or attributes differ goes out as a change, so
    // the server's cache is the fresh house again.
    const seen = (s) => JSON.stringify([s?.state, s?.attributes]);
    for (const [id, s] of states) if (seen(before.get(id)) !== seen(s)) pushState(s, before.get(id));
    for (const [id, s] of before) if (!states.has(id)) pushState({ ...s, state: "unavailable", attributes: {} }, s);
    areas = initialAreas();
    entityRegistry = initialEntityRegistry();
    // The server re-reads the registries on this, so the rooms are fresh too.
    pushEvent("entity_registry_updated", { action: "update", entity_id: null, changes: {} });
    serviceDelayMs = 0;
    failing = new Map();
    silent = new Set();
  }

  function readBody(req) {
    return new Promise((resolve) => {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
      });
    });
  }
  function json(res, code, body) {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const p = decodeURIComponent(url.pathname);
    let m;
    if (req.method === "POST" && p === "/_stub/registry") {
      const body = await readBody(req);
      const e = entityRegistry.find((x) => x.entity_id === body.entity_id);
      if (!e) return json(res, 404, { error: "no such entity" });
      e.area_id = body.area_id ?? null;
      pushEvent("entity_registry_updated", { action: "update", entity_id: e.entity_id, changes: { area_id: e.area_id } });
      return json(res, 200, { ok: true, entity_id: e.entity_id, area_id: e.area_id });
    }
    if (req.method === "POST" && p === "/_stub/service") {
      const body = await readBody(req);
      if (body.delay_ms != null) serviceDelayMs = Number(body.delay_ms) || 0;
      if (body.fail != null) failing = new Map(Object.entries(body.fail));
      if (body.silent != null) silent = new Set(body.silent);
      return json(res, 200, { delay_ms: serviceDelayMs, fail: Object.fromEntries(failing), silent: [...silent] });
    }
    if (req.method === "POST" && p === "/_stub/state") {
      const { entity_id, state, attributes } = await readBody(req);
      if (typeof entity_id !== "string") return json(res, 400, { error: "entity_id" });
      return json(res, 200, setState(entity_id, state, attributes));
    }
    if (req.method === "POST" && p === "/_stub/reset") {
      reset();
      return json(res, 200, { ok: true });
    }
    if (p === "/api/") return json(res, 200, { message: "API running." });
    if (p === "/api/states") return json(res, 200, [...states.values()]);
    if ((m = p.match(/^\/api\/states\/(.+)$/))) {
      const s = states.get(m[1]);
      return s ? json(res, 200, s) : json(res, 404, { message: "Entity not found." });
    }
    if (p === "/api/calendars") {
      return json(res, 200, [
        { entity_id: "calendar.family", name: "Family" },
        { entity_id: "calendar.evan", name: "Evan" },
      ]);
    }
    if ((m = p.match(/^\/api\/calendars\/(.+)$/))) return json(res, 200, calendarEvents(m[1]));
    if (p === "/api/services/weather/get_forecasts") {
      const body = await readBody(req);
      const list = body.type === "daily" ? dailyForecast() : forecast();
      return json(res, 200, { changed_states: [], service_response: { [body.entity_id]: { forecast: list } } });
    }
    if ((m = p.match(/^\/api\/services\/([^/]+)\/([^/]+)$/))) {
      applyService(m[1], m[2], await readBody(req));
      return json(res, 200, []);
    }
    if (p.startsWith("/api/hls/")) {
      const f = p.replace(/^\/api\/hls\/[^/]+\//, "");
      const pl = (body) => { res.writeHead(200, { "content-type": "application/vnd.apple.mpegurl" }); res.end(body); };
      if (f === "master_playlist.m3u8") return pl('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,CODECS="avc1.640028"\nplaylist.m3u8\n');
      if (f === "playlist.m3u8") return pl('#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:2.000,\nsegment/0.m4s\n#EXTINF:2.000,\nsegment/1.m4s\n');
      res.writeHead(200, { "content-type": "video/mp4" });
      return res.end(Buffer.alloc(64));
    }
    if ((m = p.match(/^\/api\/image_proxy\/(.+)$/))) {
      if (!req.headers.authorization) return json(res, 401, { message: "stub: no auth" });
      res.writeHead(200, { "content-type": "image/svg+xml" });
      return res.end(m[1].includes("cover") ? coverSvg() : mapSvg());
    }
    if ((m = p.match(/^\/api\/camera_proxy_stream\/(.+)$/)) && states.has(m[1])) {
      if (!req.headers.authorization) return json(res, 401, { message: "stub: no auth" });
      res.writeHead(200, { "content-type": "multipart/x-mixed-replace; boundary=frame" });
      const send = () => {
        res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${JPEG.length}\r\n\r\n`);
        res.write(JPEG);
        res.write("\r\n");
      };
      send();
      const t = setInterval(send, 200);
      req.on("close", () => clearInterval(t));
      return;
    }
    if ((m = p.match(/^\/api\/camera_proxy\/([^?]+)$/)) && states.has(m[1])) {
      if (!req.headers.authorization) return json(res, 401, { message: "stub: no auth" });
      res.writeHead(200, { "content-type": "image/jpeg" });
      return res.end(JPEG);
    }
    if (p.startsWith("/api/media_player_proxy/")) {
      if (!req.headers.authorization) return json(res, 401, { message: "stub: no auth" });
      res.writeHead(200, { "content-type": "image/svg+xml" });
      return res.end(coverSvg());
    }
    json(res, 404, { message: `stub: no handler for ${req.method} ${p}` });
  });

  const wss = new WebSocketServer({ server, path: "/api/websocket" });
  wss.on("connection", (ws) => {
    // subId: the state_changed subscription; subs: every event type's, by type.
    const entry = { ws, subId: null, subs: {} };
    sockets.add(entry);
    ws.on("close", () => sockets.delete(entry));
    ws.send(JSON.stringify({ type: "auth_required", ha_version: "2026.10.1" }));
    ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const reply = (result, success = true, error) =>
        ws.send(JSON.stringify({ id: msg.id, type: "result", success, result, ...(error ? { error } : {}) }));
      switch (msg.type) {
        case "auth":
          return ws.send(JSON.stringify({ type: "auth_ok", ha_version: "2026.10.1" }));
        case "get_states":
          return reply([...states.values()]);
        case "subscribe_events":
          if (!msg.event_type || msg.event_type === "state_changed") entry.subId = msg.id;
          entry.subs[msg.event_type ?? "state_changed"] = msg.id;
          return reply(null);
        case "unsubscribe_events":
          return reply(null);
        case "call_service": {
          const data = { ...(msg.service_data ?? {}), ...(msg.target ?? {}) };
          const ids = [].concat(data.entity_id ?? []);
          const failed = ids.find((id) => failing.has(id));
          const go = () => {
            if (failed) return reply(null, false, { code: "stub", message: failing.get(failed) });
            if (!ids.some((id) => silent.has(id))) applyService(msg.domain, msg.service, data);
            reply({ context: { id: "stub" } });
          };
          if (serviceDelayMs > 0) setTimeout(go, serviceDelayMs);
          else go();
          return;
        }
        case "supervisor/api":
          log("[stub] supervisor/api", msg.method, msg.endpoint);
          return reply({});
        case "config/area_registry/list":
          return reply(areas);
        case "config/device_registry/list":
          return reply(DEVICES);
        case "config/entity_registry/list":
          return reply(entityRegistry);
        case "recorder/statistics_during_period":
          return reply(statistics(msg));
        case "history/history_during_period":
          return reply(history(msg));
        case "assist_pipeline/pipeline/list":
          return reply({ pipelines: [{ id: "stub", name: "Claude", stt_engine: "stt.stub", tts_engine: "tts.stub", conversation_engine: "conversation.claude" }], preferred_pipeline: "stub" });
        case "assist_pipeline/pipeline/get":
          return reply({ id: "stub", name: "Claude", stt_engine: "stt.stub", tts_engine: "tts.stub", conversation_engine: "conversation.claude" });
        case "camera/stream":
          return reply({ url: "/api/hls/stubtoken0123456789/master_playlist.m3u8" });
        case "assist_pipeline/run":
          return reply(null, false, { code: "stub", message: "voice not available in the stub" });
        default:
          return reply(null);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const actualPort = server.address().port;
      const url = `http://${host}:${actualPort}`;
      log(`stub HA on ${url}`);
      resolve({
        url,
        port: actualPort,
        states,
        getState: (id) => states.get(id),
        setState,
        pushEvent,
        applyService,
        reset,
        /** Steer service calls: `{ delay_ms, fail: { id: why }, silent: [ids] }`. */
        setServiceBehaviour({ delay_ms = 0, fail = {}, silent: quiet = [] } = {}) {
          serviceDelayMs = delay_ms;
          failing = new Map(Object.entries(fail));
          silent = new Set(quiet);
        },
        close: () =>
          new Promise((done) => {
            for (const s of sockets) s.ws.terminate();
            wss.close();
            server.closeAllConnections?.();
            server.close(() => done());
          }),
      });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createStub({ port: Number(process.env.STUB_PORT ?? 8310), log: console.log }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
