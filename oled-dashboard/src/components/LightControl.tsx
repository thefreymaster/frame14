import { Box, Icon, Switch } from "@chakra-ui/react";
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

/**
 * One light or switch: the whole tile is a Chakra Switch (a labelled
 * checkbox), with the switch itself as the pip in the corner. "On" is the
 * chip fill with an amber wash composited over it — the `warm` palette — so
 * the lit state survives the bright/dark swap instead of relying on a border
 * that vanishes on white.
 */
export function LightControl({ entity_id, name, Icon: LightIcon }: Props) {
  const { data } = useEntity<LightAttrs>(entity_id);
  const state = data?.state;
  const isOn = state === "on";
  const unavailable = !state || state === "unavailable" || state === "unknown";
  const label = data?.attributes?.friendly_name ?? name;

  if (unavailable) return null;

  return (
    <Switch.Root
      data-light-entry=""
      size="pip"
      colorPalette="warm"
      checked={isOn}
      onCheckedChange={() => callService(entity_id, "toggle")}
      position="relative"
      aspectRatio="1"
      borderRadius="chip"
      bg="surface.chip"
      backgroundImage={
        isOn
          ? "linear-gradient({colors.warm.muted}, {colors.warm.muted})"
          : undefined
      }
      boxShadow={isOn ? "0 0 2.4vmin {colors.warm.muted}" : "none"}
      cursor="pointer"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap="1vmin"
      px="1.2vmin"
      _active={{ transform: "scale(0.94)", opacity: 0.85 }}
      transition="transform 80ms cubic-bezier(0.2, 0, 0.2, 1), background-color 140ms ease, box-shadow 180ms ease, opacity 140ms ease"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Switch.HiddenInput />
      <Box position="absolute" top="1.2vmin" right="1.2vmin">
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Box>
      <Icon
        color={isOn ? "accent.warm" : "fg.faint"}
        boxSize="5.5vmin"
        transition="color 200ms ease"
      >
        <LightIcon />
      </Icon>
      <Switch.Label
        fontSize="2vmin"
        fontWeight={isOn ? "500" : "300"}
        color={isOn ? "fg" : "fg.muted"}
        letterSpacing="0.01em"
        textAlign="center"
        truncate
        maxWidth="100%"
        lineHeight="1.2"
        transition="color 200ms ease"
      >
        {label}
      </Switch.Label>
    </Switch.Root>
  );
}
