import { Box } from "@chakra-ui/react";
import { NeonGreeting } from "./NeonGreeting";
import { NightSky } from "./NightSky";
import { PumpkinPatch } from "./PumpkinPatch";
import { WitchFlight } from "./WitchFlight";

/**
 * The Halloween page's picture, the screen over: the night sky with its
 * stars, moon and bats; the greeting in neon; a hill of jack-o'-lanterns
 * under a bare tree; and the witch who flies through now and then. Its own
 * night colours whatever the theme — a picture, not a page of cards.
 * Portrait-first for the 1600x2400 frame, sized in vmin / vw / % so a
 * landscape desktop gets the same picture, wider. The animations are
 * index.css's `hw-*` keyframes, every one off under prefers-reduced-motion
 * (the `hw-scene` class).
 */
export function HalloweenScene() {
  return (
    <Box
      className="hw-scene"
      position="relative"
      width="100%"
      height="100%"
      minHeight="var(--app-height, 100dvh)"
      overflow="hidden"
      color="white"
      bg="#07030f"
      bgImage="radial-gradient(ellipse 60% 40% at 72% 16%, rgba(130, 60, 200, 0.35), transparent 70%), linear-gradient(180deg, #07030f 0%, #130826 55%, #1c0b36 100%)"
    >
      <NightSky />
      <NeonGreeting />
      <PumpkinPatch />
      <WitchFlight />
    </Box>
  );
}
