import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitiesConfig } from "./useEntitiesConfig";
import { useFeatureData } from "./useFeatures";
import { useEntities } from "./useEntity";
import type { HomeForecastPeriod, HomeWeather } from "./useHomeData";

interface WeatherResponse {
  state: string;
  temperature?: number | null;
  apparentTemperature?: number | null;
  temperatureUnit?: string | null;
  humidity?: number | null;
  windSpeed?: number | null;
  windSpeedUnit?: string | null;
  windBearing?: number | null;
  pressure?: number | null;
  pressureUnit?: string | null;
  visibility?: number | null;
  visibilityUnit?: string | null;
  uvIndex?: number | null;
  forecast: HomeForecastPeriod[];
  forecastHours?: HomeForecastPeriod[];
  forecastDaily?: HomeForecastPeriod[];
}

interface WeatherAttributes {
  temperature?: number | string | null;
  temperature_unit?: string | null;
  humidity?: number | string | null;
}

function parseFloatOrNull(
  value: number | string | undefined | null,
): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

async function fetchWeather(): Promise<WeatherResponse> {
  const res = await fetch("/api/home/weather");
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherResponse>;
}

/**
 * The weather, live: /api/home/weather every five minutes (the conditions
 * now, the next hours and the days ahead), refetched as soon as either
 * weather entity changes over the socket, with the condition, temperature
 * and humidity read straight from the current-conditions entity's live state
 * in between. `loading` holds until either has answered. Shared by /home's
 * weather cards (useHomeData) and /weather, which read one query and one set
 * of subscriptions.
 */
export function useHomeWeather(): {
  weather: HomeWeather | null;
  loading: boolean;
} {
  const queryClient = useQueryClient();
  const entitiesQuery = useEntitiesConfig();
  const configured = entitiesQuery.data?.weather;
  // Without a weather entity there's nothing to ask for (lib/features).
  const { enabled, waiting } = useFeatureData("weather");
  const entities = useMemo(
    () =>
      [
        { key: "current" as const, entityId: configured?.current ?? "" },
        { key: "forecast" as const, entityId: configured?.forecast ?? "" },
      ].filter((entity) => entity.entityId),
    [configured],
  );

  const query = useQuery<WeatherResponse>({
    queryKey: ["home", "weather"],
    queryFn: fetchWeather,
    enabled,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 5,
  });
  const states = useEntities<WeatherAttributes>(
    entities.map(({ entityId }) => entityId),
  );

  const revision = states
    .map((result) => result.data?.last_updated ?? "")
    .join("|");
  useEffect(() => {
    if (!revision) return;
    void queryClient.invalidateQueries({ queryKey: ["home", "weather"] });
  }, [queryClient, revision]);

  const liveByKey = new Map(
    entities.map(({ key }, index) => [key, states[index]?.data]),
  );
  const live = liveByKey.get("current");
  // A restored answer from before the entity was taken out isn't shown.
  const wx = enabled || waiting ? query.data : undefined;
  const weather: HomeWeather | null =
    !live && !wx
      ? null
      : {
          state: live?.state ?? wx?.state ?? "unknown",
          temperature:
            parseFloatOrNull(live?.attributes?.temperature) ??
            wx?.temperature ??
            null,
          apparentTemperature: wx?.apparentTemperature ?? null,
          temperatureUnit:
            live?.attributes?.temperature_unit ?? wx?.temperatureUnit ?? null,
          humidity:
            parseFloatOrNull(live?.attributes?.humidity) ??
            wx?.humidity ??
            null,
          windSpeed: wx?.windSpeed ?? null,
          windSpeedUnit: wx?.windSpeedUnit ?? null,
          windBearing: wx?.windBearing ?? null,
          pressure: wx?.pressure ?? null,
          pressureUnit: wx?.pressureUnit ?? null,
          visibility: wx?.visibility ?? null,
          visibilityUnit: wx?.visibilityUnit ?? null,
          uvIndex: wx?.uvIndex ?? null,
          forecast: wx?.forecast ?? [],
          forecastHours: wx?.forecastHours ?? wx?.forecast ?? [],
          forecastDaily: wx?.forecastDaily ?? [],
        };

  return {
    weather,
    loading: (enabled || waiting) && weather == null && query.isPending,
  };
}
