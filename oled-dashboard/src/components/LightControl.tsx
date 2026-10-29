import { useEffect, useState } from "react";
import {
  Box,
  Card,
  Circle,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { toaster } from "./ui/toaster";
import { useEntity } from "../hooks/useEntity";
import { useLongPress } from "../hooks/useLongPress";
import { callService } from "../lib/callService";
import {
  brightnessPct,
  inkOn,
  lightColor,
  lightFeatures,
  rgba,
  type LightAttrs,
} from "../lib/lightModel";
import type { LightEntry } from "../lib/lightsConfig";

type Props = LightEntry & {
  /** Press and hold on a dimmable light opens its controls. */
  onOpen: (entityId: string) => void;
};

// A tap's pending spinner gives up — with a toast — if Home Assistant hasn't
// reported the light in its new state by then. Longer than the call's own
// timeout (lib/callService), so a rejected call shows its error first.
const STATE_TIMEOUT_MS = 15_000;

/**
 * One light or switch as a tile, in the manner of Apple Home: a round badge
 * with the bulb and what it's doing ("80%", "On", "Off") across the top, the
 * name under them.
 *
 * An on tile takes the light's own colour (Home Assistant's rgb_color, so a
 * warm white glows amber and a blue nightlight blue; amber for lights that
 * don't report one): the badge is filled with it, the tile is washed with it,
 * and a stronger wash fills the tile from the left to the brightness level.
 * Off, it is the plain outline card with a grey badge.
 *
 * A tap turns it off or on (0.125: the explicit service, not toggle, so the
 * state it waits for is known). From the tap until Home Assistant reports
 * the light in that state the badge shows a spinner and further taps are
 * ignored; the server's ack carries Home Assistant's answer, and a refusal —
 * or no new state within STATE_TIMEOUT_MS — ends the spinner with an error
 * toast. Press and hold on a dimmable light opens LightDialog (brightness,
 * warmth, colour).
 */
export function LightControl({
  entity_id,
  name,
  Icon: LightIcon,
  ActiveIcon,
  onOpen,
}: Props) {
  const { data } = useEntity<LightAttrs>(entity_id);
  const attrs = data?.attributes;
  const state = data?.state;
  const isOn = state === "on";
  const unavailable = !state || state === "unavailable" || state === "unknown";
  const label = attrs?.friendly_name ?? name;
  const features = lightFeatures(attrs);
  const pct = isOn ? brightnessPct(attrs) : null;
  const color = lightColor(isOn, attrs);
  const longPress = useLongPress(() => onOpen(entity_id), {
    enabled: features.brightness,
  });
  // The state a tap is waiting for, or null. Done once the light reports
  // that state — reset during render, as React allows for a derived reset.
  const [pending, setPending] = useState<"on" | "off" | null>(null);
  if (pending && state === pending) setPending(null);

  // Give up, and say so, if it never does.
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setPending(null);
      toaster.create({
        type: "error",
        title: `${label} didn't turn ${pending}`,
        description:
          "Home Assistant took the call, but the light hasn't reported the change.",
      });
    }, STATE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pending, label]);

  async function tap() {
    if (pending) return;
    const target = isOn ? "off" : "on";
    setPending(target);
    const result = await callService(
      entity_id,
      target === "off" ? "turn_off" : "turn_on",
    );
    if (!result.ok) {
      setPending(null);
      toaster.create({
        type: "error",
        title: `Couldn't turn ${target} ${label}`,
        description: result.error,
      });
    }
  }

  if (unavailable) return null;

  const status = !isOn ? "Off" : pct != null ? `${pct}%` : "On";
  const BadgeIcon = isOn ? ActiveIcon : LightIcon;

  return (
    <Card.Root
      asChild
      data-light-entry=""
      size="sm"
      variant="outline"
      borderRadius="sm"
      position="relative"
      overflow="hidden"
      minW="0"
      bg={color ? rgba(color, 0.12) : undefined}
      borderColor={color ? rgba(color, 0.45) : undefined}
      transition="background-color 300ms ease, border-color 300ms ease"
      cursor="pointer"
      focusVisibleRing="outside"
      _active={{ transform: "scale(0.98)" }}
      css={{ touchAction: "manipulation" }}
    >
      <button
        type="button"
        aria-pressed={isOn}
        aria-busy={pending != null}
        aria-label={`${label}: ${status}`}
        onClick={() => void tap()}
        {...longPress}
      >
        {color && pct != null && (
          <Box
            position="absolute"
            insetY="0"
            left="0"
            width={`${pct}%`}
            bg={rgba(color, 0.16)}
            transition="width 400ms ease"
            pointerEvents="none"
          />
        )}
        <VStack position="relative" align="stretch" gap="3" p="3">
          <HStack justify="space-between" align="center" gap="2">
            <Circle
              size="2.5rem"
              flexShrink={0}
              bg={color ? rgba(color, 1) : "bg.emphasized"}
              color={color ? inkOn(color) : "fg.muted"}
              transition="background-color 300ms ease"
            >
              {pending ? (
                <Spinner size="sm" borderWidth="2px" />
              ) : (
                <Icon boxSize="5">
                  <BadgeIcon />
                </Icon>
              )}
            </Circle>
            <Text
              textStyle="sm"
              fontWeight={isOn ? "semibold" : undefined}
              color={isOn ? "fg" : "fg.muted"}
            >
              {status}
            </Text>
          </HStack>
          {/* The whole width for the name, and two lines before it cuts
              off: "Kitchen Cabinet Lights" keeps its last word. */}
          <Text
            textStyle="sm"
            fontWeight="medium"
            lineHeight="short"
            lineClamp="2"
            textAlign="start"
          >
            {label}
          </Text>
        </VStack>
      </button>
    </Card.Root>
  );
}
