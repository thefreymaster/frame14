import { useCallback, useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";
import { WitchSilhouette } from "./WitchSilhouette";

/** A flight: which way, how high, how long. */
interface Flight {
  id: number;
  toRight: boolean;
  /** Where she crosses, as a % of the height from the top. */
  lane: number;
  ms: number;
}

// Shortly after the page comes up, then now and then: a witch is a
// sighting, not a screensaver.
const FIRST_MS: [number, number] = [3_000, 6_000];
const NEXT_MS: [number, number] = [15_000, 40_000];
const FLIGHT_MS: [number, number] = [8_000, 12_000];
// Over the greeting's head — across the moon, among the bats.
const LANE: [number, number] = [6, 40];

const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

/**
 * The witch who flies through the scene occasionally. A flight is drawn at
 * random (direction, height, speed), crosses the whole width from off one
 * side to off the other (hw-fly-right / hw-fly-left), bobbing as she goes
 * (hw-ride), and the next is booked when it ends. Under
 * prefers-reduced-motion she stays home.
 */
export function WitchFlight() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flights = useRef(0);

  const book = useCallback((range: [number, number]) => {
    timer.current = setTimeout(() => {
      flights.current += 1;
      setFlight({
        id: flights.current,
        toRight: Math.random() < 0.5,
        lane: between(LANE),
        ms: between(FLIGHT_MS),
      });
    }, between(range));
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    book(FIRST_MS);
    return () => clearTimeout(timer.current);
  }, [book]);

  if (!flight) return null;
  return (
    <Box
      key={flight.id}
      position="absolute"
      top={`${flight.lane}%`}
      left={flight.toRight ? "-45vw" : undefined}
      right={flight.toRight ? undefined : "-45vw"}
      width="min(42vmin, 36vw)"
      pointerEvents="none"
      style={{
        animation: `${flight.toRight ? "hw-fly-right" : "hw-fly-left"} ${flight.ms}ms linear forwards`,
      }}
      onAnimationEnd={(e) => {
        // The ride's and the sparks' animations bubble up too; only the
        // crossing itself ends the flight.
        if (e.target !== e.currentTarget) return;
        setFlight(null);
        book(NEXT_MS);
      }}
    >
      <Box style={{ animation: "hw-ride 1.7s ease-in-out infinite alternate" }}>
        <WitchSilhouette
          style={flight.toRight ? undefined : { transform: "scaleX(-1)" }}
        />
      </Box>
    </Box>
  );
}
