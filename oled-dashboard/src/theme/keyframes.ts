import { defineKeyframes } from "@chakra-ui/react";

/** The dashboard's own motion, on top of Chakra's (fade-in, scale-in, …). */
export const keyframes = defineKeyframes({
  // Route mount (PageTransition).
  "page-in": {
    from: { opacity: 0, transform: "scale(0.97)" },
    to: { opacity: 1, transform: "scale(1)" },
  },
  // Ken Burns drift on the photo slideshow.
  "slow-zoom": {
    from: { transform: "scale(1)" },
    to: { transform: "scale(1.2)" },
  },
  "poster-in": {
    from: { opacity: 0, transform: "scale(0.96)" },
    to: { opacity: 1, transform: "scale(1)" },
  },
  "fan-spin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" },
  },
  // A thermostat ring breathing while the system runs.
  "ring-pulse": {
    "0%, 100%": { opacity: 0 },
    "50%": { opacity: 1 },
  },
  // Recording dot, finished timer.
  blink: {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.3 },
  },
  "rise-in": {
    from: { opacity: 0, transform: "translateY(8%) scale(0.98)" },
    to: { opacity: 1, transform: "none" },
  },
  // Solar chart drawing in left to right.
  "chart-reveal": {
    from: { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
    to: { clipPath: "inset(0 0 0 0)", opacity: 1 },
  },
});
