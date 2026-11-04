import { useState } from "react";
import { Card, HStack, Icon, Image, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuMonitor } from "react-icons/lu";
import { TbBrandDocker } from "react-icons/tb";
import { useEntity } from "../hooks/useEntity";
import {
  containerIcon,
  fmtPercent,
  fmtReading,
  guestStatus,
  type GuestAttrs,
  type GuestKind,
  type UnraidContainer,
  type UnraidVm,
} from "../lib/unraid";
import { Status } from "./ui/status";

/**
 * One Docker container or VM on the Unraid page (0.151.0), to read, not to
 * switch (the user: "I only want read data"): its icon (a container's
 * Unraid template's, Docker's whale without one or when it won't load, a
 * screen for a VM; faded while stopped), its name, its status — Running,
 * Paused, Restarting, Stopped — and, for a container running with its CPU and
 * memory sensors enabled in Home Assistant, what it uses on a line under
 * that (beside the status, it ran out of room on the frame).
 */
export function UnraidGuestTile({
  kind,
  guest,
}: {
  kind: GuestKind;
  guest: UnraidContainer | UnraidVm;
}) {
  const { data: state } = useEntity<GuestAttrs>(guest.switch);
  const cpuId = "cpu" in guest ? guest.cpu : null;
  const memoryId = "memory" in guest ? guest.memory : null;
  const cpu = useEntity(cpuId ?? "").data;
  const memory = useEntity(memoryId ?? "").data;
  const status = guestStatus(kind, state);
  const icon = kind === "container" ? containerIcon(state) : null;
  // The template's icon, until it fails to load.
  const [broken, setBroken] = useState<string | null>(null);
  const usage = [
    cpuId && status.running && `${fmtPercent(cpu)} CPU`,
    memoryId && status.running && fmtReading(memory),
  ].filter(Boolean);
  const dim = status.running ? undefined : { opacity: 0.5 };

  return (
    <Card.Root
      size="sm"
      variant="outline"
      // Concentric with the card's corners, as every tile is.
      borderRadius="sm"
      data-guest={guest.name}
      data-kind={kind}
    >
      <Card.Body p="3">
        <HStack gap="3">
          {icon && broken !== icon ? (
            <Image
              src={icon}
              alt=""
              boxSize="8"
              flexShrink="0"
              objectFit="contain"
              loading="lazy"
              referrerPolicy="no-referrer"
              filter={status.running ? undefined : "grayscale(1)"}
              {...dim}
              onError={() => setBroken(icon)}
            />
          ) : (
            <Icon boxSize="8" flexShrink="0" color="fg.muted" {...dim}>
              {kind === "vm" ? <LuMonitor /> : <TbBrandDocker />}
            </Icon>
          )}
          <Stack gap="0.5" flex="1" minW="0">
            <Text fontWeight="medium" truncate>
              {guest.name}
            </Text>
            {state ? (
              <Status
                size="sm"
                textStyle="sm"
                color="fg.muted"
                colorPalette={status.palette}
              >
                {status.label}
              </Status>
            ) : (
              <Skeleton height="4" width="5rem" />
            )}
            {usage.length > 0 && (
              <Text textStyle="xs" color="fg.muted" truncate>
                {usage.join(" · ")}
              </Text>
            )}
          </Stack>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}
