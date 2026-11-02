import { useQuery } from "@tanstack/react-query";

export interface ForecastPeriod {
  datetime: string;
  temperature: number;
  templow: number | null;
  condition: string;
  precipitation: number | null;
  precipitationProbability: number | null;
  windSpeed: string | null;
  windBearing: number | null;
}

export interface WeatherData {
  state: string;
  temperature: number;
  temperatureUnit: string;
  humidity: number;
  windSpeed: string | number;
  windBearing: number;
  pressure: number;
  visibility: number;
  forecast: ForecastPeriod[];
}

async function fetchWeather(): Promise<WeatherData> {
  const res = await fetch("/api/weather");
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherData>;
}

export function useWeather() {
  return useQuery({
    queryKey: ["weather"],
    queryFn: fetchWeather,
    refetchInterval: 1000 * 60 * 5,
  });
}
