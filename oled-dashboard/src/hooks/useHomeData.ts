import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity } from "./useEntity";

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
}

interface WeatherResponse {
  state: string;
  temperature?: number;
  humidity?: number;
  forecast: HomeForecastPeriod[];
}

const PERSON_ENTITIES = [
  { id: "person.evan", name: "Evan" },
  { id: "person.elizabeth", name: "Elizabeth" },
] as const;

function parseFloatOrNull(value: string | undefined | null): number | null {
  if (value == null) return null;
  const n = parseFloat(value);
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
  // Weather
  const weatherQuery = useQuery<WeatherResponse>({
    queryKey: ["home", "weather"],
    queryFn: fetchWeather,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });

  // Climate
  const climateQuery = useQuery<ClimateResponse[]>({
    queryKey: ["home", "climate"],
    queryFn: fetchClimate,
    refetchInterval: 1000 * 60,
    staleTime: 1000 * 60,
  });

  // Energy
  const energyQuery = useQuery<EnergyResponse>({
    queryKey: ["home", "energy"],
    queryFn: fetchEnergy,
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 30,
  });

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

  const homeWeather = useMemo<HomeWeather | null>(() => {
    const wx = weatherQuery.data;
    if (!wx) return null;
    return {
      state: wx.state,
      temperature: wx.temperature ?? null,
      humidity: wx.humidity ?? null,
      forecast: wx.forecast ?? [],
    };
  }, [weatherQuery.data]);

  const homeClimate = useMemo<HomeClimate[]>(
    () =>
      (climateQuery.data ?? []).map((c) => ({
        entity_id: c.entity_id,
        name: c.name,
        state: c.state,
        currentTemp: c.currentTemp,
        targetTemp: c.targetTemp,
        hvacMode: c.hvacMode,
      })),
    [climateQuery.data],
  );

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

  const homeEnergy = useMemo<HomeEnergy>(
    () => ({
      currentProduction: energyQuery.data?.currentProduction ?? 0,
      currentConsumption: energyQuery.data?.currentConsumption ?? 0,
      productionToday: energyQuery.data?.production ?? 0,
      consumptionToday: energyQuery.data?.consumption ?? 0,
    }),
    [energyQuery.data],
  );

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
