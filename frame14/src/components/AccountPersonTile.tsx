import { Card, HStack, Icon, IconButton, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import {
  IoEaselOutline,
  IoGlobeOutline,
  IoLaptopOutline,
  IoPencil,
  IoPhonePortraitOutline,
  IoTabletPortraitOutline,
} from "react-icons/io5";
import type { Person } from "../hooks/useAccount";
import { deviceLabel } from "../lib/deviceAlias";
import { TILE_WELL } from "../lib/floatingSurface";
import { fmtWhen } from "../lib/format";
import { DeviceAliasForm } from "./DeviceAliasForm";
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
 * Whether the pointer here is a mouse's: the edit button takes the focus
 * back after the typing only where it is. On a touch screen there is no
 * focus to keep, and a button focused after a field wears a ring nobody
 * asked for (the field showed its focus, so the browser shows the next).
 */
const finePointer = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: fine)").matches;

/**
 * One person on one kind of device, in Settings' Account card (0.168.0):
 * the device's glyph, their email, and whether a page of theirs is open on
 * it now — a green "Here now" — or when the last one closed. The row of the
 * device in hand says "This device" there instead: it is here by definition,
 * and a badge beside the address squeezed both lines on a phone.
 *
 * The device goes by its alias where it has one, else by its kind (0.173.0,
 * lib/deviceAlias) — the glyph says the kind either way — and the pencil at
 * the row's far end sets it (the user: "add an edit icon button to the far
 * right of each that allows the editing of the name. Maybe let us set an
 * alias instead"): the row's two lines give way to DeviceAliasForm, in the
 * same height, until it is saved or left. Every row has one, not this
 * device's alone: an alias is the server's, and the same on every device.
 *
 * But for that pencil — a ghost, with no face — nothing to press, so in
 * Embossed it is a well in its card, as an Unraid tile is (TILE_WELL,
 * 0.172.0, the user: "The signed in devices should also be concave on
 * embossed mode"); an outlined card in every other theme.
 */
export function AccountPersonTile({
  person,
  self,
}: {
  person: Person;
  self: boolean;
}) {
  const [editing, setEditing] = useState(false);
  // Once the typing has ended the pencil is back, and with the focus.
  const [typed, setTyped] = useState(false);
  const label = deviceLabel(person);
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
      data-alias={person.alias}
      data-online={person.online ? "" : undefined}
      data-self={self ? "" : undefined}
    >
      <Card.Body p="3">
        {/* As tall with the field in it as with the two lines: the rows
            under it stay where they are. */}
        <HStack gap="3" minH="12">
          <Icon boxSize="6" flexShrink="0" color="fg.muted">
            {deviceIcon(person.device)}
          </Icon>
          {editing ? (
            <DeviceAliasForm
              person={person}
              onDone={() => {
                setEditing(false);
                setTyped(true);
              }}
            />
          ) : (
            <>
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
                  {label} ·{" "}
                  {self
                    ? "This device"
                    : person.online
                      ? "Here now"
                      : `Last here ${lastHere(person.lastSeen)}`}
                </Status>
              </Stack>
              <IconButton
                variant="ghost"
                size="xs"
                color="fg.muted"
                flexShrink="0"
                aria-label={`Set an alias for ${person.email}'s ${person.device}`}
                onClick={() => setEditing(true)}
                autoFocus={typed && finePointer()}
                data-alias-edit=""
              >
                <IoPencil />
              </IconButton>
            </>
          )}
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
