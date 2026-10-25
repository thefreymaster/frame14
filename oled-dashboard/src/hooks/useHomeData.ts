import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useClimate } from "./useClimate";
import { useEnergyToday } from "./useEnergyToday";
import { useHomeWeather } from "./useHomeWeather";
import { useLiveEnergy } from "./useLiveEnergy";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities, useEntity, type HAState } from "./useEntity";
import { printerEntityIds } from "../lib/printerEntities";

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
  /** What it feels like, when the entity reports it. */
  apparentTemperature: number | null;
  /** "°F" or "°C", as Home Assistant reports it. */
  temperatureUnit: string | null;
  humidity: number | null;
  windSpeed: number | null;
  /** "mph" or "km/h", as Home Assistant reports it; the forecasts' wind is in it too. */
  windSpeedUnit: string | null;
  windBearing: number | null;
  pressure: number | null;
  pressureUnit: string | null;
  visibility: number | null;
  visibilityUnit: string | null;
  uvIndex: number | null;
  /** The next 8 hours, from the current one. */
  forecast: HomeForecastPeriod[];
  /** The next 24 hours, for /weather's Hourly tab. */
  forecastHours: HomeForecastPeriod[];
  /**
   * Up to 10 days from today (today's first): temperature is the high,
   * templow the low.
   */
  forecastDaily: HomeForecastPeriod[];
}

export interface HomeClimate {
  entity_id: string;
  name: string;
  state: string;
  currentTemp: number | null;
  /** The room's relative humidity, %, when the thermostat reports one. */
  currentHumidity: number | null;
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

/**
 * Which parts of HomeData have not landed yet, so each card can show its own
 * placeholder while the rest of the page is already live. True only before the
 * first answer — a background refetch keeps the data it has.
 */
export interface HomeLoading {
  weather: boolean;
  climate: boolean;
  energy: boolean;
  /**
   * Today's curve (the energy card's strip) hasn't landed. The card draws
   * without it, so only the launch splash waits on this one.
   */
  energyCurve: boolean;
  calendar: boolean;
  /** Only while fans are configured; with none the card never shows. */
  fan: boolean;
  /** Only while vacuums are configured. */
  vacuum: boolean;
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

/** Every entity has pushed a live state, so the REST snapshot isn't needed. */
function allLive(states: { data?: unknown }[]): boolean {
  return states.length > 0 && states.every((state) => state.data != null);
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

async function fetchCalendar(): Promise<CalendarResponse> {
  const res = await fetch("/api/home/calendar");
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  return res.json() as Promise<CalendarResponse>;
}

export function useHomeData() {
  const queryClient = useQueryClient();
  const entitiesQuery = useEntitiesConfig();
  const vacuumEntityIds = useMemo(
    () => [...new Set(entitiesQuery.data?.vacuums ?? [])],
    [entitiesQuery.data?.vacuums],
  );
  const fanEntityIds = useMemo(
    () => [...new Set(entitiesQuery.data?.fans ?? [])],
    [entitiesQuery.data?.fans],
  );
  // Weather: the live model /weather shares (one query, one set of entity
  // subscriptions).
  const { weather: homeWeather, loading: weatherLoading } = useHomeWeather();

  // Climate: the live model /climate shares (one query, one set of entity
  // subscriptions).
  const { climate: homeClimate, loading: climateLoading } = useClimate();

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

  // Energy: the live model /energy's Now card shares (one /api/energy query,
  // one set of entity subscriptions).
  const { energy: homeEnergy, loading: energyLoading } = useLiveEnergy();
  // The same query the energy card draws its strip from; read here only so
  // the splash can wait for it, and the strip doesn't appear after the card.
  const energyTodayQuery = useEnergyToday();

  // People
  const personEvan = useEntity(PERSON_ENTITIES[0].id);
  const personElizabeth = useEntity(PERSON_ENTITIES[1].id);

  // Printer — entity IDs derived from the configured status sensor
  // (ha-bambulab or Bambuddy naming, see lib/printerEntities)
  const printerIds = useMemo(
    () => printerEntityIds(entitiesQuery.data?.printer),
    [entitiesQuery.data?.printer],
  );
  // useEntities drops empty IDs from its results, so only ask for the fields
  // this integration has; results then line up with printerExtraKeys.
  const printerExtraKeys = useMemo(
    () => PRINTER_EXTRA_KEYS.filter((key) => printerIds[key]),
    [printerIds],
  );
  const printerStatus = useEntity(printerIds.status);
  const printerProgress = useEntity(printerIds.progress);
  const printerRemaining = useEntity(printerIds.remainingTime);
  const printerTask = useEntity(printerIds.taskName);
  const printerExtras = useEntities(
    printerExtraKeys.map((key) => printerIds[key]),
  );

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

  const calendarStateRevision = calendarStates
    .map((result) => result.data?.last_updated ?? "")
    .join("|");

  useEffect(() => {
    if (!calendarStateRevision) return;
    void queryClient.invalidateQueries({ queryKey: ["home", "calendar"] });
  }, [calendarStateRevision, queryClient]);

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
    printerExtraKeys.reduce(
      (acc, key, index) => {
        acc[key] = printerExtras[index]?.data?.state;
        return acc;
      },
      {} as Record<PrinterExtraKey, string | undefined>,
    );
  const homePrinter: HomePrinter = {
    // Bambuddy reports RUNNING / PAUSE; ha-bambulab running / pause.
    status: printerStatus.data?.state?.toLowerCase() ?? "unknown",
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

  // A card is ready as soon as its own data is: the REST snapshot, or live
  // socket states for every one of its entities, whichever comes first. The
  // energy card waits for /api/energy alone — its daily totals come from there.
  const loading: HomeLoading = {
    weather: weatherLoading,
    climate: climateLoading,
    energy: energyLoading,
    energyCurve: energyTodayQuery.isPending,
    calendar: calendarQuery.isPending,
    fan: fanEntityIds.length > 0 && fanQuery.isPending && !allLive(fanStates),
    vacuum:
      vacuumEntityIds.length > 0 &&
      vacuumQuery.isPending &&
      !allLive(vacuumStates),
  };

  return {
    data,
    loading,
    isError: false,
  };
}
