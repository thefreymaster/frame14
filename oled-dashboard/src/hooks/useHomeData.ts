import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useEntities, useEntity, type HAState } from "./useEntity";

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
  finishTime: string | null;
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
}

interface WeatherAttributes {
  temperature?: number | string | null;
  humidity?: number | string | null;
}

const PERSON_ENTITIES = [
  { id: "person.evan", name: "Evan" },
  { id: "person.elizabeth", name: "Elizabeth" },
] as const;

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
  };
}

async function fetchClimate(): Promise<ClimateResponse[]> {
  const res = await fetch("/api/home/climate");
  if (!res.ok) throw new Error(`Climate fetch failed: ${res.status}`);
  return res.json() as Promise<ClimateResponse[]>;
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

  // Printer
  const printerStatus = useEntity("sensor.a1_03919c442700723_print_status");
  const printerProgress = useEntity("sensor.a1_03919c442700723_print_progress");
  const printerRemaining = useEntity(
    "sensor.a1_03919c442700723_remaining_time",
  );
  const printerTask = useEntity("sensor.a1_03919c442700723_task_name");
  const printerFinish = useEntity("sensor.a1_finish_time");

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

  const homePrinter = useMemo<HomePrinter>(
    () => ({
      status: printerStatus.data?.state ?? "unknown",
      progress: parseFloatOrZero(printerProgress.data?.state),
      remainingTime: parseFloatOrZero(printerRemaining.data?.state),
      taskName: printerTask.data?.state ?? null,
      finishTime: printerFinish.data?.state ?? null,
    }),
    [
      printerStatus.data,
      printerProgress.data,
      printerRemaining.data,
      printerTask.data,
      printerFinish.data,
    ],
  );

  const liveEnergyByKey = new Map(
    energyEntities.map(({ key }, index) => [key, energyStates[index]?.data]),
  );
  const homeEnergy: HomeEnergy = {
    currentProduction:
      parseFloatOrNull(liveEnergyByKey.get("currentProduction")?.state) ??
      energyQuery.data?.currentProduction ??
      0,
    currentConsumption:
      parseFloatOrNull(liveEnergyByKey.get("currentConsumption")?.state) ??
      energyQuery.data?.currentConsumption ??
      0,
    productionToday:
      parseFloatOrNull(liveEnergyByKey.get("productionToday")?.state) ??
      energyQuery.data?.production ??
      0,
    consumptionToday:
      parseFloatOrNull(liveEnergyByKey.get("consumptionToday")?.state) ??
      energyQuery.data?.consumption ??
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
      energy: homeEnergy,
      internet: homeInternet,
      calendar: calendarQuery.data ?? { today: [], tomorrow: [] },
    }),
    [
      homeWeather,
      homeClimate,
      homePeople,
      homePrinter,
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
