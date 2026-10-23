import { HStack, Icon, Image, Spacer, Text } from "@chakra-ui/react";
import { MdWifi, MdWifiOff } from "react-icons/md";
import { useSocket } from "../hooks/useSocket";
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

/**
 * The header across the top of every view: the app's icon and name (and, off
 * a phone, the mic) at the left; running appliances, the connection and (on a desktop) the time at the
 * right. (The version is on the Settings page.)
 *
 * Layout renders it, and it comes and goes with the nav (so /blank, photos and
 * posters stay full-bleed). Fixed like the nav: the page scrolls under it, and
 * Layout pads the page down by HEADER_CLEARANCE. Its background runs up through
 * the status-bar inset, so in an iPhone home-screen app nothing shows under the
 * clock and notch, and its row sits a little below the inset (HEADER_TOP),
 * clear of the band iOS blurs. It spans the full width; in landscape the
 * floating rail starts below it. The side padding is the cards' PAGE_GUTTER,
 * so the icons line up with the cards' edges.
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
      borderBottomWidth="1px"
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
  );
}
