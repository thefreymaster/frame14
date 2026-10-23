import { HStack, Icon, Text } from "@chakra-ui/react";
import { useEntity } from "../hooks/useEntity";
import { callService } from "../lib/callService";
import { lightColor, rgba, type LightAttrs } from "../lib/lightModel";
import type { LightEntry } from "../lib/lightsConfig";
import { Switch } from "./ui/switch";

/**
 * One light or switch in the desktop lights strip: an on/off Switch, then the
 * bulb (lit, in the light's own colour, while on) and the name, on one line.
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
    <Switch
      size="sm"
      colorPalette="yellow"
      checked={on}
      onCheckedChange={(e) =>
        callService(entity_id, e.checked ? "turn_on" : "turn_off")
      }
      flexShrink={0}
      cursor="pointer"
    >
      <HStack gap="1.5" whiteSpace="nowrap">
        <Icon
          boxSize="4"
          color={color ? rgba(color) : "fg.muted"}
          transition="color 300ms ease"
        >
          <BulbIcon />
        </Icon>
        <Text textStyle="sm" color={on ? "fg" : "fg.muted"}>
          {label}
        </Text>
      </HStack>
    </Switch>
  );
}
