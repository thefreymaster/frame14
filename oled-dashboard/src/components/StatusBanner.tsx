import { HStack, Icon, Image, Spacer, Text } from "@chakra-ui/react";
import { useSocket } from "../hooks/useSocket";
import { connectionLabel, type ConnectionStatus } from "../lib/connection";
import { ConnectionIcon } from "./ConnectionIcon";
import {
  HEADER_CLEARANCE,
  HEADER_ICON_SIZE,
  HEADER_TOP,
  PAGE_GUTTER,
} from "../lib/navMetrics";
import { ApplianceIndicators } from "./ApplianceIndicators";
import { HeaderClock } from "./HeaderClock";
import { useDesktop } from "../hooks/useDesktop";
import { Tooltip } from "./ui/tooltip";

// Grey while connecting — on load, and after a drop while socket.io
// retries — and red only once it has been down a minute (lib/connection).
const CONNECTION_COLOR: Record<ConnectionStatus, string> = {
  connected: "fg.success",
  connecting: "fg.muted",
  disconnected: "fg.error",
};

/**
 * The header across the top of every view: the app's icon and name at the
 * left; running appliances, the connection, the mic and (on a desktop) the
 * time at the right. (The version is on the Settings page.)
 *
 * Layout renders it, and it comes and goes with the nav (so /blank, photos and
 * posters stay full-bleed). Fixed like the nav: the page scrolls under it, and
 * Layout pads the page down by HEADER_CLEARANCE. It's the page's own black
 * (or white), with no edge, so it reads as part of the page rather than a
 * floating bar. Its background runs up through the status-bar inset, so in an
 * iPhone home-screen app nothing shows under the clock and notch, and its row
 * sits a little below the inset (HEADER_TOP), clear of the band iOS blurs. It
 * spans the full width; in landscape the floating rail starts below it. The
 * side padding is the cards' PAGE_GUTTER, so the icons line up with the cards'
 * edges.
 */
export function StatusBanner({
  hidden = false,
  voice,
}: {
  hidden?: boolean;
  /** The mic, after the status icons (before the clock on a desktop). */
  voice?: React.ReactNode;
}) {
  const { status } = useSocket();
  const connection = connectionLabel(status);
  // The clock only on a desktop: a phone shows its own, and the frame has
  // the big one on Home and /clock.
  const desktop = useDesktop();

  return (
    <HStack
      position="fixed"
      top={0}
      left={0}
      right={0}
      height={HEADER_CLEARANCE}
      pt={HEADER_TOP}
      pl={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
      pr={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
      gap="3"
      bg="bg"
      zIndex="sticky"
      transform={hidden ? "translateY(-100%)" : "translateY(0)"}
      transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <HStack gap="2">
        {/* The app icon, at the status icons' size. */}
        <Image
          src="/favicon-96x96.png"
          alt=""
          boxSize={HEADER_ICON_SIZE}
          rounded="sm"
          flexShrink={0}
        />
        <Text textStyle={{ base: "md", md: "lg" }} fontWeight="semibold">
          Frame14
        </Text>
      </HStack>
      <Spacer />
      <ApplianceIndicators />
      <Tooltip content={connection}>
        <Icon
          boxSize={HEADER_ICON_SIZE}
          color={CONNECTION_COLOR[status]}
          flexShrink={0}
          aria-label={connection}
        >
          <ConnectionIcon status={status} />
        </Icon>
      </Tooltip>
      {voice}
      {desktop && <HeaderClock />}
    </HStack>
  );
}
