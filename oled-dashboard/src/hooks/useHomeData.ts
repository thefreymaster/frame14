import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntity, type HAState } from "./useEntity";

export interface HomeWeather {
  state: string;
  temperature: number | null;
  humidity: number | null;
}

export interface HomeClimate {
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

interface WeatherAttributes {
  temperature?: number;
  humidity?: number;
}

interface ClimateAttributes {
  current_temperature?: number;
  temperature?: number;
  hvac_mode?: string;
}

function projectClimate(
  name: string,
  d: HAState<ClimateAttributes> | undefined,
): HomeClimate {
  return {
    name,
    state: d?.state ?? "unknown",
    currentTemp: d?.attributes?.current_temperature ?? null,
    targetTemp: d?.attributes?.temperature ?? null,
    hvacMode: d?.attributes?.hvac_mode ?? d?.state ?? null,
  };
}

const CLIMATE_ENTITIES = [
  { id: "climate.1st_floor_ac", name: "1st Floor" },
  { id: "climate.2nd_floor_ac", name: "2nd Floor" },
  { id: "climate.3rd_floor_ac", name: "3rd Floor" },
  { id: "climate.guest_room_ac", name: "Guest" },
] as const;

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

async function fetchCalendar(): Promise<CalendarResponse> {
  const res = await fetch("/api/home/calendar");
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  return res.json() as Promise<CalendarResponse>;
}

export function useHomeData() {
  // Weather
  const weather = useEntity<WeatherAttributes>("weather.openweathermap");
  const temperature = weather?.data?.attributes.temperature;
  const humidity = weather?.data?.attributes.humidity;

  // Climate
  const climate1 = useEntity<ClimateAttributes>(CLIMATE_ENTITIES[0].id);
  const climate2 = useEntity<ClimateAttributes>(CLIMATE_ENTITIES[1].id);
  const climate3 = useEntity<ClimateAttributes>(CLIMATE_ENTITIES[2].id);
  const climateGuest = useEntity<ClimateAttributes>(CLIMATE_ENTITIES[3].id);

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

  // Energy
  const energyCurProd = useEntity(
    "sensor.envoy_482518016321_current_power_production",
  );
  const energyCurCons = useEntity(
    "sensor.envoy_482518016321_current_power_consumption",
  );
  const energyProdToday = useEntity(
    "sensor.envoy_482518016321_energy_production_today",
  );
  const energyConsToday = useEntity(
    "sensor.envoy_482518016321_energy_consumption_today",
  );

  // Internet
  const ping = useEntity("binary_sensor.1_1_1_1");

  const calendarQuery = useQuery<CalendarResponse>({
    queryKey: ["home", "calendar"],
    queryFn: fetchCalendar,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });

  // @ts-ignore
  const homeWeather = useMemo<HomeWeather | null>(() => {
    const wx = weather.data;
    if (!wx) return null;
    return {
      state: wx.state,
      temperature,
      humidity,
    };
  }, [weather.data, temperature, humidity]);

  const homeClimate = useMemo<HomeClimate[]>(
    () => [
      projectClimate(CLIMATE_ENTITIES[0].name, climate1.data),
      projectClimate(CLIMATE_ENTITIES[1].name, climate2.data),
      projectClimate(CLIMATE_ENTITIES[2].name, climate3.data),
      projectClimate(CLIMATE_ENTITIES[3].name, climateGuest.data),
    ],
    [climate1.data, climate2.data, climate3.data, climateGuest.data],
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
      currentProduction: parseFloatOrZero(energyCurProd.data?.state),
      currentConsumption: parseFloatOrZero(energyCurCons.data?.state),
      productionToday: parseFloatOrZero(energyProdToday.data?.state),
      consumptionToday: parseFloatOrZero(energyConsToday.data?.state),
    }),
    [
      energyCurProd.data,
      energyCurCons.data,
      energyProdToday.data,
      energyConsToday.data,
    ],
  );

  const homeInternet = useMemo<HomeInternet>(
    () => ({ connected: ping.data?.state === "on" }),
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

  const isPending = weather.data === undefined;

  return {
    data,
    isPending,
    isError: false,
  };
}
