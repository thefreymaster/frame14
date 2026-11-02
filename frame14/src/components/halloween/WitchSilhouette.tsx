import type { CSSProperties } from "react";

// Green sparks off the bristles, each on its own beat (hw-spark).
const SPARKS = [
  { cx: 14, cy: 84, r: 2.6, delay: 0 },
  { cx: 8, cy: 100, r: 2, delay: 0.5 },
  { cx: 12, cy: 116, r: 2.4, delay: 0.9 },
  { cx: 22, cy: 124, r: 1.8, delay: 1.3 },
];

/**
 * A witch on her broom, flying to the right (`scaleX(-1)` turns her round):
 * a black cut-out with a violet glow, sparks off the bristles. 240 x 150
 * units; sized by whoever places her.
 */
export function WitchSilhouette({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 240 150"
      role="img"
      aria-label="A witch on a broom"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        overflow: "visible",
        filter:
          "drop-shadow(0 0 0.35vmin #c45cff) drop-shadow(0 0 1.4vmin rgba(196, 92, 255, 0.75))",
        ...style,
      }}
    >
      <g
        fill="#05030a"
        stroke="#05030a"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The broom: bristles, their binding, the handle. */}
        <path d="M56,96 L16,74 L6,88 L4,104 L10,122 L58,108 Z" />
        <path d="M54,94 L60,112" strokeWidth="6" />
        <path d="M56,102 L214,70" strokeWidth="6" />
        {/* The cape streaming behind, the dress. */}
        <path d="M130,56 C104,64 86,78 80,98 C98,88 112,88 122,94 Z" />
        <path d="M128,50 L140,50 L156,100 L112,104 Z" />
        {/* An arm to the handle; the legs and boots. */}
        <path d="M136,60 L170,80" strokeWidth="5" />
        <path d="M146,100 L160,118 L174,114" strokeWidth="5" fill="none" />
        <path d="M134,102 L146,122 L160,120" strokeWidth="5" fill="none" />
        {/* Head, nose, a lock of hair. */}
        <circle cx="136" cy="40" r="10" />
        <path d="M145,38 L153,42 L144,45 Z" />
        <path d="M128,44 C118,48 112,56 110,66" strokeWidth="3" fill="none" />
        {/* The hat, its tip bent back. */}
        <ellipse cx="136" cy="32" rx="19" ry="4.5" />
        <path d="M122,32 L150,32 L142,12 Q146,2 162,4 Q148,6 139,16 Z" />
      </g>
      {SPARKS.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="#4dff3a"
          style={{
            animation: `hw-spark 1.6s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}
