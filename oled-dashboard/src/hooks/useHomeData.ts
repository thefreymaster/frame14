import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { socket } from "../lib/socket";

export interface HomeWeather {
  state: string;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  pressure: number | null;
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

async function fetchHome(): Promise<HomeData> {
  const res = await fetch("/api/home");
  if (!res.ok) throw new Error(`Home fetch failed: ${res.status}`);
  return res.json() as Promise<HomeData>;
}

export function useHomeData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    function onHomeUpdate(data: HomeData) {
      queryClient.setQueryData(["home"], data);
    }
    socket.on("home_update", onHomeUpdate);
    return () => {
      socket.off("home_update", onHomeUpdate);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["home"],
    queryFn: fetchHome,
    refetchInterval: 1000 * 60, // fallback HTTP poll every 60s; socket is primary
  });
}
