/** The disc, in the drawing's own units: a 24 box, the edge's line inside it. */
const BOX = 24;
const CENTRE = BOX / 2;
const RADIUS = 9.25;
const EDGE = 1.5;

/**
 * The moon as it stands tonight, drawn rather than picked from a set of
 * eight: the lit part of the disc filled, from the limb to the terminator —
 * half an ellipse as wide as the lit share says, so a moon three days old is
 * a thinner crescent than one five days old — the dark part a faint wash,
 * and the disc's edge a line. Lit at the right while it waxes and at the
 * left while it wanes, as it is seen from the northern half of the world.
 * `currentColor`, and sized by the font size, as the weather's icons are.
 */
export function MoonIcon({ lit, waxing }: { lit: number; waxing: boolean }) {
  const share = Math.min(1, Math.max(0, lit));
  const top = `${CENTRE},${CENTRE - RADIUS}`;
  const foot = `${CENTRE},${CENTRE + RADIUS}`;
  // The terminator's half-width: none at a half moon, the disc's at new and
  // full. Down the lit limb, then back up the terminator — bulging towards
  // the limb on a crescent, away from it on a gibbous moon.
  const half = (RADIUS * Math.abs(1 - 2 * share)).toFixed(3);
  const lune = `M${top} A${RADIUS},${RADIUS} 0 0 1 ${foot} A${half},${RADIUS} 0 0 ${share > 0.5 ? 1 : 0} ${top} Z`;

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width="1em"
      height="1em"
      data-moon-icon
      data-lit-side={waxing ? "right" : "left"}
      aria-hidden
    >
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RADIUS}
        fill="currentColor"
        fillOpacity={0.12}
      />
      <path
        d={lune}
        fill="currentColor"
        transform={waxing ? undefined : `matrix(-1 0 0 1 ${BOX} 0)`}
      />
      <circle
        cx={CENTRE}
        cy={CENTRE}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={EDGE}
      />
    </svg>
  );
}
