import { Box, HStack, Icon, Image, Spacer, Text } from "@chakra-ui/react";
import { MdWifi, MdWifiOff } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
import { FLOATING_SURFACE } from "../lib/floatingSurface";
import {
  HEADER_HEIGHT,
  HEADER_ICON_SIZE,
  HEADER_TOP,
  PAGE_GUTTER,
  STATUS_BAR_CLEARANCE,
} from "../lib/navMetrics";
import { ApplianceIndicators } from "./ApplianceIndicators";
import { HeaderClock } from "./HeaderClock";
import { useDesktop } from "../hooks/useDesktop";
import { Tooltip } from "./ui/tooltip";

/**
 * The header across the top of every view: the app's icon and name (and, off
 * a phone, the mic) at the left; running appliances, the connection and (on a desktop) the time at the
 * right. (The version is on the Settings page.)
 *
 * Layout renders it, and it comes and goes with the nav (so /blank, photos and
 * posters stay full-bleed). A slim bar floating like the navs, on their
 * surface (FLOATING_SURFACE: the cards' colour, edge and `surface` corners),
 * inset from the top and sides by the cards' PAGE_GUTTER so its edges line up
 * with theirs; in landscape the floating rail starts a gutter below it. The
 * page scrolls under it, and Layout pads the page down by HEADER_CLEARANCE. A
 * plain band covers the status-bar inset above it (STATUS_BAR_CLEARANCE, zero
 * except in an iPhone home-screen app), so nothing scrolls under the clock and
 * notch.
 */
export function StatusBanner({
  hidden = false,
  voice,
}: {
  hidden?: boolean;
  /** The header mic (desktop and the frame), beside the name. */
  voice?: React.ReactNode;
}) {
  const { connected } = useSocket();
  // The clock only on a desktop: a phone shows its own, and the frame has
  // the big one on Home and /clock.
  const desktop = useDesktop();
  const StatusIcon = connected ? MdWifi : MdWifiOff;

  return (
    <>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        height={STATUS_BAR_CLEARANCE}
        bg="bg"
        zIndex="sticky"
        transform={hidden ? "translateY(-100%)" : "translateY(0)"}
        transition="transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      />
      <HStack
        {...FLOATING_SURFACE}
        top={HEADER_TOP}
        left={`calc(env(safe-area-inset-left, 0px) + ${PAGE_GUTTER})`}
        right={`calc(env(safe-area-inset-right, 0px) + ${PAGE_GUTTER})`}
        height={HEADER_HEIGHT}
        px="3"
        py="0"
        gap="3"
        // Up past the screen edge, shadow and all.
        transform={
          hidden
            ? `translateY(calc(-100% - ${HEADER_TOP} - 1rem))`
            : "translateY(0)"
        }
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
          {voice}
        </HStack>
        <Spacer />
        <ApplianceIndicators />
        <Tooltip content={connected ? "Connected" : "Disconnected"}>
          <Icon
            boxSize={HEADER_ICON_SIZE}
            color={connected ? "fg.success" : "fg.error"}
            flexShrink={0}
            aria-label={connected ? "Connected" : "Disconnected"}
          >
            <StatusIcon />
          </Icon>
        </Tooltip>
        {desktop && <HeaderClock />}
      </HStack>
    </>
  );
}
