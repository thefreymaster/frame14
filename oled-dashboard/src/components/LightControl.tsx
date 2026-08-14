import { Box, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";
import { CHIP_RADIUS } from "../lib/surfaces";

type Props = {
  entity_id: string;
  name: string;
  Icon: IconType;
};

type LightAttrs = {
  friendly_name?: string;
};

export function LightControl({ entity_id, name, Icon }: Props) {
  const { data } = useEntity<LightAttrs>(entity_id);
  const state = data?.state;
  const isOn = state === "on";
  const unavailable = !state || state === "unavailable" || state === "unknown";
  const label = data?.attributes?.friendly_name ?? name;

  if (unavailable) return null;

  const handleClick = () => {
    callService(entity_id, "toggle");
  };

  // Amber on black, a darker amber on white — see --theme-accent-warm.
  const ON_ACCENT = "var(--theme-accent-warm)";

  return (
    <Box
      as="button"
      onClick={handleClick}
      data-light-entry=""
      position="relative"
      aspectRatio="1"
      borderRadius={CHIP_RADIUS}
      // Raised fill like every other chip; "on" is the same fill with an amber
      // wash composited over it, so the lit state survives the bright/dark swap
      // instead of relying on a border that vanishes on white.
      bg="var(--theme-surface-2)"
      backgroundImage={
        isOn
          ? "linear-gradient(rgba(255, 200, 87, 0.18), rgba(255, 200, 87, 0.18))"
          : undefined
      }
      boxShadow={isOn ? `0 0 2.4vmin rgba(255, 200, 87, 0.18)` : "none"}
      cursor="pointer"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="1vmin"
      px="1.2vmin"
      transform="scale(1)"
      transformOrigin="center"
      willChange="transform"
      _active={{ transform: "scale(0.94)", opacity: 0.85 }}
      transition="transform 80ms cubic-bezier(0.2, 0, 0.2, 1), background-color 140ms ease, box-shadow 180ms ease, opacity 140ms ease"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Box
        position="absolute"
        top="1.2vmin"
        right="1.2vmin"
        width="1.2vmin"
        height="1.2vmin"
        borderRadius="full"
        bg={isOn ? ON_ACCENT : "var(--theme-surface-1)"}
        boxShadow={isOn ? `0 0 1vmin ${ON_ACCENT}` : "none"}
        transition="background-color 140ms ease, box-shadow 180ms ease"
      />
      <Box
        color={isOn ? ON_ACCENT : "var(--theme-fg-faint)"}
        fontSize="5.5vmin"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="color 200ms ease"
      >
        <Icon />
      </Box>
      <Text
        fontSize="2vmin"
        fontWeight={isOn ? "500" : "300"}
        color={isOn ? "var(--theme-fg)" : "var(--theme-fg-muted)"}
        letterSpacing="0.01em"
        textAlign="center"
        overflow="hidden"
        whiteSpace="nowrap"
        textOverflow="ellipsis"
        maxWidth="100%"
        transition="color 200ms ease, font-weight 200ms ease"
      >
        {label}
      </Text>
    </Box>
  );
}
