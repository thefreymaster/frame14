// Shared by the forecast's hourly columns and daily rows.

/** Rain chances below this aren't worth a mention. */
export const RAIN_SHOWN_FROM = 20;

export const roundTemp = (n: number | null | undefined) =>
  n == null ? null : Math.round(n);

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** A wind bearing in degrees as its compass point ("NW"). */
export const compassPoint = (degrees: number) =>
  COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
