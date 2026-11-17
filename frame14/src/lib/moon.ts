// The moon's phase, worked out from the date. Home Assistant's WeatherKit
// (Apple Weather) entity reports nothing of the moon — not on the entity, not
// in its daily forecast, and the integration's own sensors are the
// precipitation's intensity and the pressure's trend — so there is no entity
// to read; and where the moon is in its cycle is the calendar's to say, the
// same for every house, which is how Home Assistant's own Moon integration
// has it too. No option, then, and nothing to set up.
//
// The positions are the Astronomical Almanac's low-precision series: the
// Sun's longitude within a hundredth of a degree, the Moon's within about a
// third of one — a phase's moment within the hour, which is closer than a
// name for the day and a whole percent need.

const DAY_MS = 86_400_000;
/** 2000 January 1 at noon, the series' epoch. */
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const RAD = Math.PI / 180;
const sin = (degrees: number) => Math.sin(degrees * RAD);
const cos = (degrees: number) => Math.cos(degrees * RAD);
/** An angle within a turn, 0 to 360. */
const turn = (degrees: number) => ((degrees % 360) + 360) % 360;

/** How far the Moon gains on the Sun in a day, on average: a turn a synodic month. */
const DEGREES_A_DAY = 360 / 29.530588;
/** The Moon's distance over the Sun's: what puts a half-lit moon a little short of a right angle. */
const MOON_OVER_SUN = 0.00257;
/**
 * A new, quarter or full moon is the name for the day around its moment:
 * half a day's travel either side.
 */
const NAMED_WITHIN = DEGREES_A_DAY / 2;

export type MoonPhaseName =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

/** The phases in the order the moon goes through them, from new. */
export const MOON_PHASES: MoonPhaseName[] = [
  "new",
  "waxing-crescent",
  "first-quarter",
  "waxing-gibbous",
  "full",
  "waning-gibbous",
  "last-quarter",
  "waning-crescent",
];

export const MOON_LABEL: Record<MoonPhaseName, string> = {
  new: "New moon",
  "waxing-crescent": "Waxing crescent",
  "first-quarter": "First quarter",
  "waxing-gibbous": "Waxing gibbous",
  full: "Full moon",
  "waning-gibbous": "Waning gibbous",
  "last-quarter": "Last quarter",
  "waning-crescent": "Waning crescent",
};

export interface Moon {
  phase: MoonPhaseName;
  /** How far round its cycle the moon is, 0 to 1: new at 0, the first quarter at ¼, full at ½, the last quarter at ¾. */
  cycle: number;
  /** The share of its disc that is lit, 0 to 1. */
  lit: number;
  /** Growing, from new to full. */
  waxing: boolean;
}

/** The Sun's and the Moon's places along the ecliptic at a moment, in degrees. */
function positions(ms: number) {
  const days = (ms - J2000_MS) / DAY_MS;
  const t = days / 36525;
  const anomaly = 357.528 + 0.9856003 * days;
  const sun =
    280.46 + 0.9856474 * days + 1.915 * sin(anomaly) + 0.02 * sin(2 * anomaly);
  const moon =
    218.32 +
    481267.881 * t +
    6.29 * sin(135.0 + 477198.87 * t) -
    1.27 * sin(259.3 - 413335.36 * t) +
    0.66 * sin(235.7 + 890534.22 * t) +
    0.21 * sin(269.9 + 954397.74 * t) -
    0.19 * sin(357.5 + 35999.05 * t) -
    0.11 * sin(186.5 + 966404.03 * t);
  const latitude =
    5.13 * sin(93.3 + 483202.02 * t) +
    0.28 * sin(228.2 + 960400.89 * t) -
    0.28 * sin(318.3 + 6003.15 * t) -
    0.17 * sin(217.6 - 407332.21 * t);
  return { sun, moon, latitude };
}

/** How far ahead of the Sun the Moon is along the ecliptic, 0 to 360°: what the phases are named by. */
function elongation(ms: number) {
  const { sun, moon } = positions(ms);
  return turn(moon - sun);
}

function phaseAt(degrees: number): MoonPhaseName {
  // The four moments, each a name for the day around it; a crescent or a
  // gibbous moon the rest of the quarter turn after one.
  const quarter = Math.round(degrees / 90);
  if (Math.abs(degrees - quarter * 90) <= NAMED_WITHIN) {
    return MOON_PHASES[(quarter % 4) * 2];
  }
  return MOON_PHASES[Math.floor(degrees / 90) * 2 + 1];
}

/** The moon at a moment: its phase, how far round the cycle it is and how much of it is lit. */
export function moonAt(date: Date): Moon {
  const ms = date.getTime();
  const { sun, moon, latitude } = positions(ms);
  const ahead = turn(moon - sun);
  // The angle between the two in the sky (the Moon rides up to 5° off the
  // ecliptic), then the angle the Sun and the Earth make seen from the Moon.
  const cosApart = cos(latitude) * cos(ahead);
  const sinApart = Math.sqrt(1 - cosApart * cosApart);
  const phaseAngle = Math.atan2(sinApart, MOON_OVER_SUN - cosApart);
  return {
    phase: phaseAt(ahead),
    cycle: ahead / 360,
    lit: (1 + Math.cos(phaseAngle)) / 2,
    waxing: ahead < 180,
  };
}

/**
 * The next time the moon is new (0), at its first quarter (1), full (2) or
 * at its last quarter (3), after `from`. Stepped to from the average pace
 * and corrected by what is left, which closes on the minute in a few goes.
 */
export function nextMoonPhase(from: Date, quarter: 0 | 1 | 2 | 3): Date {
  const target = quarter * 90;
  let ms = from.getTime();
  ms += (turn(target - elongation(ms)) / DEGREES_A_DAY) * DAY_MS;
  for (let i = 0; i < 6; i++) {
    // What is left, as a step either way.
    const left = turn(target - elongation(ms) + 180) - 180;
    ms += (left / DEGREES_A_DAY) * DAY_MS;
  }
  return new Date(ms);
}
