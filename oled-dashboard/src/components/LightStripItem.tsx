import { Icon, Toggle } from "@chakra-ui/react";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";
import { ENTRY_RADIUS } from "../lib/floatingSurface";
import { lightColor, rgba, type LightAttrs } from "../lib/lightModel";
import type { LightEntry } from "../lib/lightsConfig";

/**
 * One light or switch in the desktop lights strip: an on/off button drawn like
 * a side rail entry, the bulb over the name. While on it's filled like the
 * rail's selected entry and the bulb is lit in the light's own colour. Never
 * narrower than a rail entry; a long name widens it rather than wrapping.
 * Unavailable entities don't show.
 */
export function LightStripItem({
  entity_id,
  name,
  Icon: LightIcon,
  ActiveIcon,
}: LightEntry) {
  const { data } = useEntity<LightAttrs>(entity_id);
  const state = data?.state;
  if (!state || state === "unavailable" || state === "unknown") return null;

  const on = state === "on";
  const color = lightColor(on, data?.attributes);
  const label = data?.attributes?.friendly_name ?? name;
  const BulbIcon = on ? ActiveIcon : LightIcon;

  return (
    <Toggle.Root
      pressed={on}
      onPressedChange={(pressed) =>
        callService(entity_id, pressed ? "turn_on" : "turn_off")
      }
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      height="100%"
      minW="4.25rem"
      rounded={ENTRY_RADIUS}
      px="3"
      gap="1"
      textStyle="sm"
      fontWeight="medium"
      whiteSpace="nowrap"
      color="fg.muted"
      cursor="pointer"
      transition="background 150ms ease"
      focusVisibleRing="inside"
      _pressed={{ bg: { _light: "gray.100", _dark: "gray.700" }, color: "fg" }}
    >
      <Icon
        boxSize="1.375rem"
        color={color ? rgba(color) : undefined}
        transition="color 300ms ease"
      >
        <BulbIcon />
      </Icon>
      {label}
    </Toggle.Root>
  );
}
