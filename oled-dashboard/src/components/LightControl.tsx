import { Box, Text } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";

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

  const ON_ACCENT = "#FFC857";

  return (
    <Box
      as="button"
      onClick={handleClick}
      position="relative"
      aspectRatio="1"
      borderRadius="10px"
      border="1px solid"
      borderColor={isOn ? ON_ACCENT : "var(--theme-divider)"}
      bg={isOn ? "rgba(255, 200, 87, 0.10)" : "transparent"}
      boxShadow={
        isOn
          ? `inset 0 0 0 1px rgba(255, 200, 87, 0.25), 0 0 18px rgba(255, 200, 87, 0.18)`
          : "inset 0 1px 0 rgba(255, 255, 255, 0.02)"
      }
      cursor="pointer"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="min(1vmin, 6px)"
      px="min(1.5vmin, 8px)"
      transform="scale(1)"
      transformOrigin="center"
      willChange="transform"
      _active={{
        transform: "scale(0.94)",
        bg: isOn
          ? "rgba(255, 200, 87, 0.16)"
          : "rgba(255, 255, 255, 0.03)",
        boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.6)",
      }}
      transition="transform 80ms cubic-bezier(0.2, 0, 0.2, 1), background-color 140ms ease, border-color 200ms ease, box-shadow 180ms ease"
    >
      <Box
        position="absolute"
        top="min(1.5vmin, 7px)"
        right="min(1.5vmin, 7px)"
        width="min(1.4vmin, 6px)"
        height="min(1.4vmin, 6px)"
        borderRadius="full"
        bg={isOn ? ON_ACCENT : "transparent"}
        border={isOn ? "none" : "1px solid var(--theme-divider)"}
        boxShadow={isOn ? `0 0 8px ${ON_ACCENT}` : "none"}
        transition="background-color 140ms ease, box-shadow 180ms ease"
      />
      <Box
        color={isOn ? ON_ACCENT : "var(--theme-fg-faint)"}
        fontSize="min(5.5vmin, 28px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        filter={isOn ? `drop-shadow(0 0 5px rgba(255, 200, 87, 0.5))` : "none"}
        transition="color 200ms ease, filter 200ms ease"
      >
        <Icon />
      </Box>
      <Text
        fontSize="min(2vmin, 10px)"
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
