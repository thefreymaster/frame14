import { Card, HStack, Icon, Stack, Text } from "@chakra-ui/react";
import {
  IoEaselOutline,
  IoGlobeOutline,
  IoLaptopOutline,
  IoPhonePortraitOutline,
  IoTabletPortraitOutline,
} from "react-icons/io5";
import type { Person } from "../hooks/useAccount";
import { TILE_WELL } from "../lib/floatingSurface";
import { fmtWhen } from "../lib/format";
import { Status } from "./ui/status";

/** The glyph for a kind of device (lib/deviceName's names). */
function deviceIcon(device: string) {
  if (device === "iPhone" || device === "Android phone") {
    return <IoPhonePortraitOutline />;
  }
  if (device === "iPad" || device === "Android tablet") {
    return <IoTabletPortraitOutline />;
  }
  if (device === "Frame") return <IoEaselOutline />;
  if (device === "Browser") return <IoGlobeOutline />;
  return <IoLaptopOutline />;
}

/** "3:45 PM", "yesterday", "Monday", "Nov 3": when they were last here, mid-sentence. */
const lastHere = (at: string) =>
  fmtWhen(new Date(at)).replace(/^Yesterday$/, "yesterday");

/**
 * One person on one kind of device, in Settings' Account card (0.168.0):
 * the device's glyph, their email, and whether a page of theirs is open on
 * it now — a green "Here now" — or when the last one closed. The row of the
 * device in hand says "This device" there instead: it is here by definition,
 * and a badge beside the address squeezed both lines on a phone.
 *
 * Nothing to press, so in Embossed it is a well in its card, as an Unraid
 * tile is (TILE_WELL, 0.172.0, the user: "The signed in devices should also
 * be concave on embossed mode"); an outlined card in every other theme.
 */
export function AccountPersonTile({
  person,
  self,
}: {
  person: Person;
  self: boolean;
}) {
  return (
    <Card.Root
      size="sm"
      variant="outline"
      // Concentric with the card's corners, as every tile is.
      borderRadius="sm"
      {...TILE_WELL}
      role="listitem"
      data-person={person.email}
      data-device={person.device}
      data-online={person.online ? "" : undefined}
      data-self={self ? "" : undefined}
    >
      <Card.Body p="3">
        <HStack gap="3">
          <Icon boxSize="6" flexShrink="0" color="fg.muted">
            {deviceIcon(person.device)}
          </Icon>
          <Stack gap="0.5" flex="1" minW="0">
            {/* The whole address on hover, where it's cut short. */}
            <Text fontWeight="medium" truncate title={person.email}>
              {person.email}
            </Text>
            <Status
              size="sm"
              textStyle="sm"
              color="fg.muted"
              colorPalette={person.online || self ? "green" : "gray"}
            >
              {person.device} ·{" "}
              {self
                ? "This device"
                : person.online
                  ? "Here now"
                  : `Last here ${lastHere(person.lastSeen)}`}
            </Status>
          </Stack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
