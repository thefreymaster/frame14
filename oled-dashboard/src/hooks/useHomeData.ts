import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities, useEntity, type HAState } from "./useEntity";
import { printerBaseId, printerEntityId } from "../lib/printerEntities";

export interface HomeForecastPeriod {
  datetime: string;
  temperature: number | null;
  templow: number | null;
  condition: string | null;
  precipitation: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
  windBearing: number | null;
}

export interface HomeWeather {
  state: string;
  temperature: number | null;
  humidity: number | null;
  forecast: HomeForecastPeriod[];
}

export interface HomeClimate {
  entity_id: string;
  name: string;
  state: string;
  currentTemp: number | null;
  targetTemp: number | null;
  hvacMode: string | null;
  hvacAction: string | null;
  fanMode: string | null;
  fanModes: string[];
}

export interface HomePerson {
  name: string;
  state: string;
}

export interface HomePrinter {
  status: string;
  progress: number;
  remainingTime: number;
  taskName: string | null;
  nozzleTemp: number | null;
  nozzleTarget: number | null;
  bedTemp: number | null;
  bedTarget: number | null;
  currentLayer: number | null;
  totalLayers: number | null;
  currentStage: string | null;
  endTime: string | null;
  startTime: string | null;
  printLength: number | null;
  printWeight: number | null;
  activeTray: string | null;
  speedProfile: string | null;
  gcodeFilename: string | null;
}

export interface HomeVacuum {
  entity_id: string;
  name: string;
  state: string;
  progress: number | null;
  battery: number | null;
}

export interface HomeFan {
  entity_id: string;
  name: string;
  state: string;
  percentage: number | null;
  presetMode: string | null;
}

export interface HomeEnergy {
  currentProduction: number;
  currentConsumption: number;
  productionToday: number;
  consumptionToday: number;
}

export interface HomeCalendarEvent {
  summary: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  calendar: string;
}

export interface HomeInternet {
  connected: boolean;
}

export interface HomeData {
  weather: HomeWeather | null;
  climate: HomeClimate[];
  people: HomePerson[];
  printer: HomePrinter;
  vacuum: HomeVacuum[];
  fan: HomeFan[];
  energy: HomeEnergy;
  calendar: {
    today: HomeCalendarEvent[];
    tomorrow: HomeCalendarEvent[];
  };
  internet: HomeInternet;
}

interface CalendarResponse {
  today: HomeCalendarEvent[];
  tomorrow: HomeCalendarEvent[];
  entities: string[];
}

interface WeatherResponse {
  state: string;
  temperature?: number;
  humidity?: number;
  forecast: HomeForecastPeriod[];
}

interface ClimateAttributes {
  friendly_name?: string;
  current_temperature?: number | string | null;
  temperature?: number | string | null;
  hvac_mode?: string | null;
  hvac_action?: string | null;
  fan_mode?: string | null;
  fan_modes?: string[] | null;
}

interface VacuumAttributes {
  friendly_name?: string;
  cleaning_progress?: number | string | null;
  battery_level?: number | string | null;
}

interface FanAttributes {
  friendly_name?: string;
  percentage?: number | string | null;
  preset_mode?: string | null;
}

interface WeatherAttributes {
  temperature?: number | string | null;
  humidity?: number | string | null;
}

const PERSON_ENTITIES = [
  { id: "person.evan", name: "Evan" },
  { id: "person.elizabeth", name: "Elizabeth" },
] as const;

const PRINTER_EXTRA_KEYS = [
  "nozzleTemp",
  "nozzleTarget",
  "bedTemp",
  "bedTarget",
  "currentLayer",
  "totalLayers",
  "currentStage",
  "endTime",
  "startTime",
  "printLength",
  "printWeight",
  "activeTray",
  "speedProfile",
  "gcodeFilename",
] as const;

type PrinterExtraKey = (typeof PRINTER_EXTRA_KEYS)[number];

const PRINTER_EXTRA_SUFFIXES: Record<PrinterExtraKey, string> = {
  nozzleTemp: "nozzle_temperature",
  nozzleTarget: "nozzle_target_temperature",
  bedTemp: "bed_temperature",
  bedTarget: "bed_target_temperature",
  currentLayer: "current_layer",
  totalLayers: "total_layer_count",
  currentStage: "current_stage",
  endTime: "end_time",
  startTime: "start_time",
  printLength: "print_length",
  printWeight: "print_weight",
  activeTray: "active_tray",
  speedProfile: "speed_profile",
  gcodeFilename: "gcode_filename",
};

function cleanString(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value === "unavailable" || value === "unknown") return null;
  return value;
}

function parseFloatOrNull(
  value: number | string | undefined | null,
): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function parseFloatOrZero(value: string | undefined | null): number {
  return parseFloatOrNull(value) ?? 0;
}

interface ClimateResponse {
  entity_id: string;
  name: string;
  state: string;
  currentTemp: number | null;
  targetTemp: number | null;
  hvacMode: string | null;
  hvacAction: string | null;
  fanMode: string | null;
  fanModes: string[] | null;
}

interface VacuumResponse {
  entity_id: string;
  name: string;
  state: string;
  progress: number | null;
  battery: number | null;
}

interface FanResponse {
  entity_id: string;
  name: string;
  state: string;
  percentage: number | null;
  presetMode: string | null;
}

interface EnergyResponse {
  production: number;
  consumption: number;
  currentProduction: number;
  currentConsumption: number;
}

function mapClimateResponse(climate: ClimateResponse): HomeClimate {
  return {
    entity_id: climate.entity_id,
    name: climate.name,
    state: climate.state,
    currentTemp: climate.currentTemp,
    targetTemp: climate.targetTemp,
    hvacMode: climate.hvacMode,
    hvacAction: climate.hvacAction,
    fanMode: climate.fanMode ?? null,
    fanModes: climate.fanModes ?? [],
  };
}

function mapVacuumResponse(vacuum: VacuumResponse): HomeVacuum {
  return {
    entity_id: vacuum.entity_id,
    name: vacuum.name,
    state: vacuum.state,
    progress: vacuum.progress,
    battery: vacuum.battery,
  };
}

function mapVacuumState(state: HAState<VacuumAttributes>): HomeVacuum {
  return {
    entity_id: state.entity_id,
    name: state.attributes?.friendly_name ?? state.entity_id,
    state: state.state,
    progress: parseFloatOrNull(state.attributes?.cleaning_progress),
    battery: parseFloatOrNull(state.attributes?.battery_level),
  };
}

function mapFanResponse(fan: FanResponse): HomeFan {
  return {
    entity_id: fan.entity_id,
    name: fan.name,
    state: fan.state,
    percentage: fan.percentage,
    presetMode: fan.presetMode,
  };
}

function mapFanState(state: HAState<FanAttributes>): HomeFan {
  return {
    entity_id: state.entity_id,
    name: state.attributes?.friendly_name ?? state.entity_id,
    state: state.state,
    percentage: parseFloatOrNull(state.attributes?.percentage),
    presetMode: state.attributes?.preset_mode ?? null,
  };
}

function mapClimateState(state: HAState<ClimateAttributes>): HomeClimate {
  return {
    entity_id: state.entity_id,
    name: state.attributes?.friendly_name ?? state.entity_id,
    state: state.state,
    currentTemp: parseFloatOrNull(state.attributes?.current_temperature),
    targetTemp: parseFloatOrNull(state.attributes?.temperature),
    hvacMode: state.attributes?.hvac_mode ?? state.state ?? null,
    hvacAction: state.attributes?.hvac_action ?? null,
    fanMode: state.attributes?.fan_mode ?? null,
    fanModes: state.attributes?.fan_modes ?? [],
  };
}

async function fetchClimate(): Promise<ClimateResponse[]> {
  const res = await fetch("/api/home/climate");
  if (!res.ok) throw new Error(`Climate fetch failed: ${res.status}`);
  return res.json() as Promise<ClimateResponse[]>;
}

async function fetchVacuum(): Promise<VacuumResponse[]> {
  const res = await fetch("/api/home/vacuum");
  if (!res.ok) throw new Error(`Vacuum fetch failed: ${res.status}`);
  return res.json() as Promise<VacuumResponse[]>;
}

async function fetchFan(): Promise<FanResponse[]> {
  const res = await fetch("/api/home/fan");
  if (!res.ok) throw new Error(`Fan fetch failed: ${res.status}`);
  return res.json() as Promise<FanResponse[]>;
}

async function fetchEnergy(): Promise<EnergyResponse> {
  const res = await fetch("/api/energy");
  if (!res.ok) throw new Error(`Energy fetch failed: ${res.status}`);
  return res.json() as Promise<EnergyResponse>;
}

async function fetchCalendar(): Promise<CalendarResponse> {
  const res = await fetch("/api/home/calendar");
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  return res.json() as Promise<CalendarResponse>;
}

async function fetchWeather(): Promise<WeatherResponse> {
  const res = await fetch("/api/home/weather");
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherResponse>;
}

export function useHomeData() {
  const queryClient = useQueryClient();
  const entitiesQuery = useEntitiesConfig();
  const climateEntityIds = useMemo(
    () => [...new Set(entitiesQuery.data?.climate ?? [])],
    [entitiesQuery.data?.climate],
  );
  const vacuumEntityIds = useMemo(
    () => [...new Set(entitiesQuery.data?.vacuums ?? [])],
    [entitiesQuery.data?.vacuums],
  );
  const fanEntityIds = useMemo(
    () => [...new Set(entitiesQuery.data?.fans ?? [])],
    [entitiesQuery.data?.fans],
  );
  const weatherEntities = useMemo(
    () =>
      [
        {
          key: "current" as const,
          entityId: entitiesQuery.data?.weather?.current ?? "",
        },
        {
          key: "forecast" as const,
          entityId: entitiesQuery.data?.weather?.forecast ?? "",
        },
      ].filter((entity) => entity.entityId),
    [entitiesQuery.data?.weather],
  );
  const energyEntities = useMemo(
    () =>
      [
        {
          key: "currentProduction" as const,
          entityId: entitiesQuery.data?.energy?.currentProduction ?? "",
        },
        {
          key: "currentConsumption" as const,
          entityId: entitiesQuery.data?.energy?.currentConsumption ?? "",
        },
        {
          key: "productionToday" as const,
          entityId: entitiesQuery.data?.energy?.productionToday ?? "",
        },
        {
          key: "consumptionToday" as const,
          entityId: entitiesQuery.data?.energy?.consumptionToday ?? "",
        },
      ].filter((entity) => entity.entityId),
    [entitiesQuery.data?.energy],
  );

  // Weather
  const weatherQuery = useQuery<WeatherResponse>({
    queryKey: ["home", "weather"],
    queryFn: fetchWeather,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });
  const weatherStates = useEntities<WeatherAttributes>(
    weatherEntities.map(({ entityId }) => entityId),
  );

  // Climate
  const climateQuery = useQuery<ClimateResponse[]>({
    queryKey: ["home", "climate"],
    queryFn: fetchClimate,
    staleTime: Infinity,
  });
  const climateStates = useEntities<ClimateAttributes>(climateEntityIds);

  // Vacuum
  const vacuumQuery = useQuery<VacuumResponse[]>({
    queryKey: ["home", "vacuum"],
    queryFn: fetchVacuum,
    staleTime: Infinity,
  });
  const vacuumStates = useEntities<VacuumAttributes>(vacuumEntityIds);

  // Fan
  const fanQuery = useQuery<FanResponse[]>({
    queryKey: ["home", "fan"],
    queryFn: fetchFan,
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 30,
  });
  const fanStates = useEntities<FanAttributes>(fanEntityIds);

  // Energy
  const energyQuery = useQuery<EnergyResponse>({
    queryKey: ["home", "energy"],
    queryFn: fetchEnergy,
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 30,
  });
  const energyStates = useEntities(energyEntities.map(({ entityId }) => entityId));

  // People
  const personEvan = useEntity(PERSON_ENTITIES[0].id);
  const personElizabeth = useEntity(PERSON_ENTITIES[1].id);

  // Printer — entity IDs derived from the configured print_status sensor
  const printerBase = printerBaseId(entitiesQuery.data?.printer);
  const printerExtraIds = useMemo(
    () =>
      PRINTER_EXTRA_KEYS.map((key) =>
        printerEntityId(printerBase, PRINTER_EXTRA_SUFFIXES[key]),
      ),
    [printerBase],
  );
  const printerStatus = useEntity(printerEntityId(printerBase, "print_status"));
  const printerProgress = useEntity(
    printerEntityId(printerBase, "print_progress"),
  );
  const printerRemaining = useEntity(
    printerEntityId(printerBase, "remaining_time"),
  );
  const printerTask = useEntity(printerEntityId(printerBase, "task_name"));
  const printerExtras = useEntities(printerExtraIds);

  // Internet
  const ping = useEntity("binary_sensor.1_1_1_1");

  const calendarQuery = useQuery<CalendarResponse>({
    queryKey: ["home", "calendar"],
    queryFn: fetchCalendar,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });
  const calendarEntityIds = useMemo(
    () => [...new Set(calendarQuery.data?.entities ?? [])],
    [calendarQuery.data?.entities],
  );
  const calendarStates = useEntities(calendarEntityIds);

  const weatherStateRevision = weatherStates
    .map((result) => result.data?.last_updated ?? "")
    .join("|");
  const calendarStateRevision = calendarStates
    .map((result) => result.data?.last_updated ?? "")
    .join("|");

  useEffect(() => {
    if (!weatherStateRevision) return;
    void queryClient.invalidateQueries({ queryKey: ["home", "weather"] });
  }, [queryClient, weatherStateRevision]);

  useEffect(() => {
    if (!calendarStateRevision) return;
    void queryClient.invalidateQueries({ queryKey: ["home", "calendar"] });
  }, [calendarStateRevision, queryClient]);

  const liveWeatherByKey = new Map(
    weatherEntities.map(({ key }, index) => [key, weatherStates[index]?.data]),
  );
  const liveCurrentWeather = liveWeatherByKey.get("current");
  const wx = weatherQuery.data;
  const homeWeather: HomeWeather | null =
    !liveCurrentWeather && !wx
      ? null
      : {
          state: liveCurrentWeather?.state ?? wx?.state ?? "unknown",
          temperature:
            parseFloatOrNull(liveCurrentWeather?.attributes?.temperature) ??
            wx?.temperature ??
            null,
          humidity:
            parseFloatOrNull(liveCurrentWeather?.attributes?.humidity) ??
            wx?.humidity ??
            null,
          forecast: wx?.forecast ?? [],
        };

  const fallbackClimate = (climateQuery.data ?? []).map(mapClimateResponse);
  const homeClimate: HomeClimate[] =
    climateEntityIds.length === 0
      ? fallbackClimate
      : (() => {
          const fallbackById = new Map(
            fallbackClimate.map((climate) => [climate.entity_id, climate]),
          );

          return climateEntityIds
            .map((entityId, index) => {
              const liveState = climateStates[index]?.data;
              return liveState
                ? mapClimateState(liveState)
                : (fallbackById.get(entityId) ?? null);
            })
            .filter((climate): climate is HomeClimate => climate != null);
        })();

  const fallbackVacuum = (vacuumQuery.data ?? []).map(mapVacuumResponse);
  const homeVacuum: HomeVacuum[] =
    vacuumEntityIds.length === 0
      ? fallbackVacuum
      : (() => {
          const fallbackById = new Map(
            fallbackVacuum.map((vacuum) => [vacuum.entity_id, vacuum]),
          );
          return vacuumEntityIds
            .map((entityId, index) => {
              const liveState = vacuumStates[index]?.data;
              return liveState
                ? mapVacuumState(liveState)
                : (fallbackById.get(entityId) ?? null);
            })
            .filter((vacuum): vacuum is HomeVacuum => vacuum != null);
        })();

  const fallbackFan = (fanQuery.data ?? []).map(mapFanResponse);
  const homeFan: HomeFan[] =
    fanEntityIds.length === 0
      ? fallbackFan
      : (() => {
          const fallbackById = new Map(
            fallbackFan.map((fan) => [fan.entity_id, fan]),
          );
          return fanEntityIds
            .map((entityId, index) => {
              const liveState = fanStates[index]?.data;
              return liveState
                ? mapFanState(liveState)
                : (fallbackById.get(entityId) ?? null);
            })
            .filter((fan): fan is HomeFan => fan != null);
        })();

  const homePeople = useMemo<HomePerson[]>(
    () => [
      {
        name: PERSON_ENTITIES[0].name,
        state: personEvan.data?.state ?? "unknown",
      },
      {
        name: PERSON_ENTITIES[1].name,
        state: personElizabeth.data?.state ?? "unknown",
      },
    ],
    [personEvan.data, personElizabeth.data],
  );

  const printerExtraStateByKey: Record<PrinterExtraKey, string | undefined> =
    PRINTER_EXTRA_KEYS.reduce(
      (acc, key, index) => {
        acc[key] = printerExtras[index]?.data?.state;
        return acc;
      },
      {} as Record<PrinterExtraKey, string | undefined>,
    );
  const homePrinter: HomePrinter = {
    status: printerStatus.data?.state ?? "unknown",
    progress: parseFloatOrZero(printerProgress.data?.state),
    remainingTime: parseFloatOrZero(printerRemaining.data?.state),
    taskName: cleanString(printerTask.data?.state),
    nozzleTemp: parseFloatOrNull(printerExtraStateByKey.nozzleTemp),
    nozzleTarget: parseFloatOrNull(printerExtraStateByKey.nozzleTarget),
    bedTemp: parseFloatOrNull(printerExtraStateByKey.bedTemp),
    bedTarget: parseFloatOrNull(printerExtraStateByKey.bedTarget),
    currentLayer: parseFloatOrNull(printerExtraStateByKey.currentLayer),
    totalLayers: parseFloatOrNull(printerExtraStateByKey.totalLayers),
    currentStage: cleanString(printerExtraStateByKey.currentStage),
    endTime: cleanString(printerExtraStateByKey.endTime),
    startTime: cleanString(printerExtraStateByKey.startTime),
    printLength: parseFloatOrNull(printerExtraStateByKey.printLength),
    printWeight: parseFloatOrNull(printerExtraStateByKey.printWeight),
    activeTray: cleanString(printerExtraStateByKey.activeTray),
    speedProfile: cleanString(printerExtraStateByKey.speedProfile),
    gcodeFilename: cleanString(printerExtraStateByKey.gcodeFilename),
  };

  const liveEnergyByKey = new Map(
    energyEntities.map(({ key }, index) => [key, energyStates[index]?.data]),
  );

  function liveWatts(key: "currentProduction" | "currentConsumption", fallback: number): number {
    const s = liveEnergyByKey.get(key);
    if (!s) return fallback;
    const val = parseFloatOrNull(s.state);
    if (val == null) return fallback;
    const unit = (s.attributes as Record<string, unknown>)?.unit_of_measurement;
    return unit === "kW" ? val * 1000 : val;
  }

  const homeEnergy: HomeEnergy = {
    currentProduction: liveWatts("currentProduction", energyQuery.data?.currentProduction ?? 0),
    currentConsumption: liveWatts("currentConsumption", energyQuery.data?.currentConsumption ?? 0),
    // /api/energy is the authority for the daily totals — it derives them from
    // the lifetime counters' statistics. The raw "today" sensors are only a
    // fallback for when that request has not landed yet.
    productionToday:
      energyQuery.data?.production ??
      parseFloatOrNull(liveEnergyByKey.get("productionToday")?.state) ??
      0,
    consumptionToday:
      energyQuery.data?.consumption ??
      parseFloatOrNull(liveEnergyByKey.get("consumptionToday")?.state) ??
      0,
  };

  const homeInternet = useMemo<HomeInternet>(
    () => ({ connected: ping.data === undefined || ping.data.state === "on" }),
    [ping.data],
  );

  const data = useMemo<HomeData>(
    () => ({
      weather: homeWeather,
      climate: homeClimate,
      people: homePeople,
      printer: homePrinter,
      vacuum: homeVacuum,
      fan: homeFan,
      energy: homeEnergy,
      internet: homeInternet,
      calendar: calendarQuery.data ?? { today: [], tomorrow: [] },
    }),
    [
      homeWeather,
      homeClimate,
      homePeople,
      homePrinter,
      homeVacuum,
      homeFan,
      homeEnergy,
      homeInternet,
      calendarQuery.data,
    ],
  );

  const isPending = weatherQuery.isPending;

  return {
    data,
    isPending,
    isError: false,
  };
}
