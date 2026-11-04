import { useRef, useState } from "react";
import {
  Box,
  Card,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { toaster } from "./ui/toaster";
import { useEntity } from "../hooks/useEntity";
import { useLightToggle } from "../hooks/useLightToggle";
import { useLongPress } from "../hooks/useLongPress";
import { callLightService } from "../lib/callService";
import {
  brightnessPct,
  lightColor,
  lightFeatures,
  mdiIconName,
  rgba,
  type LightAttrs,
} from "../lib/lightModel";
import { MdiIcon } from "./MdiIcon";
import { displayLightName, type LightEntry } from "../lib/lightsConfig";

type Props = LightEntry & {
  /** Press and hold opens its controls (a dimmable light's alone until 0.153.0). */
  onOpen: (entityId: string) => void;
};

// Swipe to dim (0.139, the user's ask): a sideways drag across a dimmable
// tile sets the brightness to where the finger is — the fill follows it —
// and sends it on release. The direction is read after SWIPE_LOCK_PX: an up
// or down drag is the page's scroll, left to the browser (touch-action
// pan-y). The slider's lowest is the swipe's too.
const SWIPE_LOCK_PX = 8;
const SWIPE_MIN_PCT = 1;

type Drag = {
  id: number;
  x: number;
  y: number;
  left: number;
  width: number;
  locked: "none" | "swipe" | "off";
};

const pctAt = (clientX: number, d: Drag) =>
  Math.max(
    SWIPE_MIN_PCT,
    Math.min(100, Math.round(((clientX - d.left) / d.width) * 100)),
  );

/**
 * One light or switch as a tile: the bulb at the left, and beside it the name
 * over what it's doing ("80%", "On", "Off") — one row (0.139; until then a
 * round badge with the bulb and the status across the top, the name under
 * them: the user found the badge read as a button inside the tile).
 *
 * An on tile takes the light's own colour (Home Assistant's rgb_color, so a
 * warm white glows amber and a blue nightlight blue; amber for lights that
 * don't report one): the bulb is drawn in it, the tile is washed with it,
 * and a stronger wash fills the tile from the left to the brightness level.
 * Off, it is the plain outline card with a grey bulb.
 *
 * A tap turns it off or on (0.125: the explicit service, not toggle, so the
 * state it waits for is known — useLightToggle, 0.144). From the tap until
 * Home Assistant reports the light in that state a spinner stands in for the
 * bulb and further taps are ignored; the server's ack carries Home
 * Assistant's answer, and a refusal — or no new state within the hook's
 * STATE_TIMEOUT_MS — ends the spinner with an error toast. Press and hold
 * opens LightDialog — a dimmable light's brightness, warmth and colour, any
 * other's power switch, and the favourite star (every tile since 0.153.0;
 * the dimmable ones alone before, which left the rest no way to be starred)
 * — and a sideways swipe across a dimmable one sets the brightness where
 * the finger is (0.139): the fill and the figure follow the drag, the level
 * goes to Home Assistant on release and shows until the light reports a
 * change; the release's click is not a tap, and the hold is cancelled by the
 * movement as any drag cancels it.
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
  const label = displayLightName(attrs?.friendly_name ?? name);
  const features = lightFeatures(attrs);
  const pct = isOn ? brightnessPct(attrs) : null;
  const hold = useLongPress(() => onOpen(entity_id));
  // A swipe's level: under the finger, then the one sent until the light
  // reports a change (reset during render, as React allows).
  const [scrub, setScrub] = useState<number | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const [seenPct, setSeenPct] = useState(pct);
  if (pct !== seenPct) {
    setSeenPct(pct);
    if (sent !== null) setSent(null);
  }
  const drag = useRef<Drag | null>(null);
  // A swipe's release clicks the tile; that click is not a tap.
  const swiped = useRef(false);
  const shownPct = scrub ?? sent ?? pct;
  const shownOn = isOn || scrub !== null || sent !== null;
  const color = lightColor(shownOn, attrs);
  // The state a tap is waiting for, or null, and the tap itself.
  const { pending, toggle } = useLightToggle(entity_id, label, state);

  function tap() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    void toggle();
  }

  async function dimTo(value: number) {
    setScrub(null);
    setSent(value);
    const result = await callLightService(entity_id, { brightness_pct: value });
    if (!result.ok) {
      setSent(null);
      toaster.create({
        type: "error",
        title: `Couldn't dim ${label}`,
        description: result.error,
      });
    }
  }

  // The swipe's pointer handlers, around the hold's: the hold cancels itself
  // on the movement, as it does for a scroll. A tile with no brightness has
  // the hold's alone.
  const pointer = features.brightness
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          hold.onPointerDown?.(e);
          if (!e.isPrimary || e.button !== 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0) return;
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            left: rect.left,
            width: rect.width,
            locked: "none",
          };
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
          hold.onPointerMove?.(e);
          const d = drag.current;
          if (!d || e.pointerId !== d.id || d.locked === "off") return;
          if (d.locked === "none") {
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX)
              return;
            if (Math.abs(dy) > Math.abs(dx)) {
              d.locked = "off";
              return;
            }
            d.locked = "swipe";
            swiped.current = true;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Not every browser has it for every pointer.
            }
          }
          setScrub(pctAt(e.clientX, d));
        },
        onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
          hold.onPointerUp?.();
          const d = drag.current;
          drag.current = null;
          if (d?.locked === "swipe") void dimTo(pctAt(e.clientX, d));
        },
        onPointerCancel: () => {
          hold.onPointerCancel?.();
          drag.current = null;
          setScrub(null);
        },
        onPointerLeave: () => hold.onPointerLeave?.(),
        onContextMenu: (e: React.MouseEvent) => hold.onContextMenu?.(e),
      }
    : hold;

  if (unavailable) return null;

  const status = !shownOn ? "Off" : shownPct != null ? `${shownPct}%` : "On";
  const BadgeIcon = shownOn ? ActiveIcon : LightIcon;
  // The icon set for the light in Home Assistant, when one is (0.139), in
  // place of the bulb — the same glyph on or off, in the light's colour.
  const haIcon = mdiIconName(attrs?.icon);

  return (
    <Card.Root
      asChild
      data-light-entry=""
      // The tile's hold is its own (the drawer), not the page's: /home's board
      // leaves a hold that starts here alone (0.143; every tile's since
      // 0.153.0, a dimmable one's before).
      data-long-press=""
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
      // A dimmable tile takes sideways drags itself; up and down stay the
      // page's scroll.
      css={{ touchAction: features.brightness ? "pan-y" : "manipulation" }}
    >
      <button
        type="button"
        aria-pressed={isOn}
        aria-busy={pending != null}
        aria-label={`${label}: ${status}`}
        onClick={tap}
        {...pointer}
      >
        {color && shownPct != null && (
          <Box
            position="absolute"
            insetY="0"
            left="0"
            width={`${shownPct}%`}
            bg={rgba(color, 0.16)}
            transition={scrub !== null ? "none" : "width 400ms ease"}
            pointerEvents="none"
          />
        )}
        <HStack position="relative" align="center" gap="3" p="3">
          {/* The bulb, in the light's colour while on — no badge around it,
              so it doesn't read as a button inside the tile. */}
          <Box
            flexShrink={0}
            display="flex"
            boxSize="7"
            alignItems="center"
            justifyContent="center"
            color={color ? rgba(color, 1) : "fg.muted"}
            transition="color 300ms ease"
          >
            {pending ? (
              <Spinner size="sm" borderWidth="2px" />
            ) : haIcon ? (
              <MdiIcon name={haIcon} boxSize="7" />
            ) : (
              <Icon boxSize="7">
                <BadgeIcon />
              </Icon>
            )}
          </Box>
          {/* Stretched, not start-aligned: a start-aligned column is as
              wide as its longest word, and "Workshop" ran out of a narrow
              tile. Three lines before the name cuts off — the frame's
              three-across tiles have room for a word a line. */}
          <VStack align="stretch" gap="0.5" minW="0" flex="1">
            <Text
              textStyle="sm"
              fontWeight="medium"
              lineHeight="short"
              lineClamp="3"
              overflowWrap="anywhere"
              textAlign="start"
            >
              {label}
            </Text>
            <Text
              textStyle="sm"
              fontWeight={isOn ? "semibold" : undefined}
              color={isOn ? "fg" : "fg.muted"}
            >
              {status}
            </Text>
          </VStack>
        </HStack>
      </button>
    </Card.Root>
  );
}
