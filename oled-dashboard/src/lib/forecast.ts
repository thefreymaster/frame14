// Shared by the forecast's hourly columns and daily rows.

/** Rain chances below this aren't worth a mention. */
export const RAIN_SHOWN_FROM = 20;

export const roundTemp = (n: number | null | undefined) =>
  n == null ? null : Math.round(n);
