// The ground along the bottom: a dark hill with three jack-o'-lanterns and a
// bare tree. One drawing, 2000 units wide, that always fills the width and
// is cropped at the sides (xMidYMax slice): the portrait frame sees the
// middle 920 or so, a landscape desktop about 1650, so everything that
// matters sits between x = 560 and 1440.

const HILL =
  "M0,240 L0,170 C300,120 500,110 760,140 C1000,165 1200,120 1500,135 C1700,143 1850,160 2000,150 L2000,240 Z";

// Where each pumpkin sits on the hill, and how big it is.
const PUMPKINS = [
  { x: 700, y: 112, scale: 1 },
  { x: 965, y: 128, scale: 1.3 },
  { x: 1190, y: 100, scale: 0.85 },
];

const MOUTH =
  "M-32,14 L-24,22 L-16,14 L-8,22 L0,14 L8,22 L16,14 L24,22 L32,14 L26,30 L16,26 L8,34 L0,28 L-8,34 L-16,26 L-26,30 Z";

/**
 * The hill of jack-o'-lanterns under the bare tree. The faces are the only
 * light down here — candle-yellow with an orange glow, guttering a little
 * (hw-candle).
 */
export function PumpkinPatch() {
  return (
    <svg
      viewBox="0 0 2000 240"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        // Taller in portrait (34vmin on the frame is 544px, the pumpkins a
        // fifth of the width); the vh term is a landscape desktop's.
        height: "min(34vmin, 26vh)",
        display: "block",
      }}
    >
      {/* The tree, rooted in the hill. */}
      <g
        transform="translate(1385, 122) scale(1.1)"
        fill="#040208"
        stroke="#040208"
        strokeLinecap="round"
      >
        <path d="M-16,110 L16,110 L10,30 L6,-10 L-6,-10 L-10,30 Z" />
        <path d="M6,20 C30,0 50,-10 70,-40" strokeWidth="7" fill="none" />
        <path d="M-6,30 C-30,15 -45,-5 -60,-30" strokeWidth="7" fill="none" />
        <path d="M2,-8 C10,-40 0,-60 -18,-90" strokeWidth="6" fill="none" />
        <path d="M4,-5 C25,-30 40,-45 42,-80" strokeWidth="5" fill="none" />
        <path d="M50,-20 C60,-30 70,-30 80,-45" strokeWidth="3" fill="none" />
        <path d="M-40,-10 C-55,-25 -60,-35 -58,-55" strokeWidth="3" fill="none" />
        <path d="M-10,-70 C-20,-85 -30,-90 -45,-95" strokeWidth="3" fill="none" />
        <path d="M30,-55 C40,-70 55,-70 62,-85" strokeWidth="3" fill="none" />
      </g>

      <path d={HILL} fill="#06030c" />

      {PUMPKINS.map((p, i) => (
        <g key={i} transform={`translate(${p.x}, ${p.y}) scale(${p.scale})`}>
          <path
            d="M-6,-40 C-8,-52 -2,-58 8,-56 C2,-50 2,-44 4,-38 Z"
            fill="#3f7a2a"
          />
          <ellipse cx="0" cy="0" rx="50" ry="40" fill="#ff7a1a" />
          <ellipse cx="-22" cy="0" rx="26" ry="38" fill="#f26a0f" />
          <ellipse cx="22" cy="0" rx="26" ry="38" fill="#f26a0f" />
          <ellipse cx="0" cy="0" rx="20" ry="40" fill="#ff8a2a" />
          <g
            fill="#ffe066"
            style={{
              filter:
                "drop-shadow(0 0 4px #ffcc33) drop-shadow(0 0 10px #ff8800)",
              animation: `hw-candle ${2.6 + i * 0.7}s ease-in-out ${i * 0.4}s infinite`,
            }}
          >
            <polygon points="-28,-6 -12,-6 -20,-22" />
            <polygon points="12,-6 28,-6 20,-22" />
            <polygon points="-5,8 5,8 0,0" />
            <path d={MOUTH} />
          </g>
        </g>
      ))}
    </svg>
  );
}
