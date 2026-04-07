import { useQuery } from "@tanstack/react-query";

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

export interface HomeData {
  weather: HomeWeather | null;
  climate: HomeClimate[];
  people: HomePerson[];
  printer: HomePrinter;
  energy: HomeEnergy;
}

async function fetchHome(): Promise<HomeData> {
  const res = await fetch("/api/home");
  if (!res.ok) throw new Error(`Home fetch failed: ${res.status}`);
  return res.json() as Promise<HomeData>;
}

export function useHomeData() {
  return useQuery({
    queryKey: ["home"],
    queryFn: fetchHome,
    refetchInterval: 1000 * 30,
  });
}
