import { Icon, Text, Toggle } from "@chakra-ui/react";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";
import { ENTRY_RADIUS } from "../lib/floatingSurface";
import { lightColor, rgba, type LightAttrs } from "../lib/lightModel";
import type { LightEntry } from "../lib/lightsConfig";
import { LIGHT_STRIP_ITEM_WIDTH } from "../lib/navMetrics";

/**
 * One light or switch in the desktop lights strip: an on/off button drawn like
 * a side rail entry, the bulb over the name. While on it's filled a neutral
 * grey (gray.100 / gray.700; the nav's selected entry has no fill since 0.71)
 * and the bulb is lit in the light's own colour. Every
 * button is the same width, and a longer name is cut off with an ellipsis (the
 * whole name in the tooltip). Unavailable entities don't show.
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
      title={label}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      width={LIGHT_STRIP_ITEM_WIDTH}
      height="100%"
      rounded={ENTRY_RADIUS}
      px="2"
      gap="1"
      textStyle="sm"
      fontWeight="medium"
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
      <Text as="span" truncate maxW="100%">
        {label}
      </Text>
    </Toggle.Root>
  );
}
