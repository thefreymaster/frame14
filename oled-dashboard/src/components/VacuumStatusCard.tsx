import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Flex,
  HStack,
  Progress,
  SimpleGrid,
  Spacer,
  Stack,
  Stat,
  Text,
} from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import {
  IoFlash,
  IoHomeOutline,
  IoLocateOutline,
  IoPause,
  IoPlay,
} from "react-icons/io5";
import type { VacuumModel } from "../hooks/useVacuum";
import { callVacuumService } from "../lib/callService";
import { fmtDuration, fmtWhen, sentenceCase } from "../lib/format";
import { fanSpeedLabel, vacuumState } from "../lib/vacuum";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { SegmentedControl } from "./ui/segmented-control";

function fmtArea(area: number | null, unit: string): string {
  if (area == null || area <= 0) return "—";
  return `${area >= 100 ? Math.round(area) : Math.round(area * 10) / 10} ${unit}`;
}

/**
 * A vacuum's state and controls: its name and state (Charging while docked
 * and charging) in the header, any error, the battery as a big figure over a
 * bar, the clean's progress while it runs, the clean's area and time and when
 * it last ran, the suction setting, and Clean / Pause / Resume, Dock and
 * Locate.
 */
export function VacuumStatusCard({ vacuum }: { vacuum: VacuumModel }) {
  const { label, palette } = vacuumState(vacuum.state, vacuum.charging);
  const offline = vacuum.state === "unavailable" || vacuum.loading;
  const busy = ["cleaning", "returning", "paused"].includes(vacuum.state);
  const battery = Math.max(0, Math.min(100, vacuum.battery ?? 0));
  const batteryPalette =
    vacuum.battery != null && vacuum.battery <= 20
      ? "red"
      : vacuum.charging
        ? "green"
        : "blue";
  // The integration's finer status, where it says more than the badge does.
  const detail =
    vacuum.status &&
    sentenceCase(vacuum.status).toLowerCase() !== label.toLowerCase()
      ? sentenceCase(vacuum.status)
      : null;
  const primary =
    vacuum.state === "cleaning"
      ? { service: "pause" as const, text: "Pause", icon: <IoPause /> }
      : vacuum.state === "paused"
        ? { service: "start" as const, text: "Resume", icon: <IoPlay /> }
        : { service: "start" as const, text: "Clean", icon: <IoPlay /> };
  const docked = vacuum.state === "docked" || vacuum.state === "returning";

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle>{vacuum.name}</SectionTitle>
          <Spacer />
          {!vacuum.loading && <Badge colorPalette={palette}>{label}</Badge>}
        </Flex>
      }
    >
      <Stack gap="6">
        {vacuum.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Title>{sentenceCase(vacuum.error)}</Alert.Title>
          </Alert.Root>
        )}

        <Progress.Root value={battery} colorPalette={batteryPalette} size="lg">
          <HStack justify="space-between" align="baseline" gap="4">
            <Text textStyle="5xl" fontWeight="semibold" lineHeight="1">
              {vacuum.battery != null ? (
                <NumberFlow value={Math.round(vacuum.battery)} />
              ) : (
                "—"
              )}
              %
            </Text>
            <HStack gap="1" color="fg.muted" textStyle="lg">
              {vacuum.charging && <IoFlash />}
              <Text>{vacuum.charging ? "Charging" : "Battery"}</Text>
            </HStack>
          </HStack>
          <Progress.Track mt="4">
            <Progress.Range />
          </Progress.Track>
          {(detail || vacuum.since) && (
            <Text textStyle="sm" color="fg.muted" mt="2">
              {[detail, vacuum.since && `since ${fmtWhen(vacuum.since)}`]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
        </Progress.Root>

        {busy && vacuum.progress != null && (
          <Progress.Root value={vacuum.progress} colorPalette="green">
            <HStack justify="space-between">
              <Progress.Label>This clean</Progress.Label>
              <Progress.ValueText>
                {Math.round(vacuum.progress)}%
              </Progress.ValueText>
            </HStack>
            <Progress.Track mt="2">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}

        <SimpleGrid columns={3} gap="4">
          <Stat.Root size="sm">
            <Stat.Label>Area</Stat.Label>
            <Stat.ValueText>
              {fmtArea(vacuum.area, vacuum.areaUnit)}
            </Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="sm">
            <Stat.Label>Time</Stat.Label>
            <Stat.ValueText>{fmtDuration(vacuum.cleanMinutes)}</Stat.ValueText>
          </Stat.Root>
          <Stat.Root size="sm">
            <Stat.Label>Last run</Stat.Label>
            <Stat.ValueText>{fmtWhen(vacuum.lastClean)}</Stat.ValueText>
          </Stat.Root>
        </SimpleGrid>

        {vacuum.fanSpeeds.length > 0 && (
          <Field.Root>
            <Field.Label>Suction</Field.Label>
            <Box width="100%" overflowX="auto">
              <SegmentedControl
                size="sm"
                width="100%"
                disabled={offline}
                items={vacuum.fanSpeeds.map((s) => ({
                  value: s,
                  label: fanSpeedLabel(s),
                }))}
                value={vacuum.fanSpeed}
                aria-label="Suction"
                // The settings share the row.
                css={{
                  "& [data-part=item]": { flex: "1", justifyContent: "center" },
                }}
                onValueChange={(e) => {
                  if (e.value && e.value !== vacuum.fanSpeed) {
                    callVacuumService(vacuum.entityId, "set_fan_speed", {
                      fan_speed: e.value,
                    });
                  }
                }}
              />
            </Box>
          </Field.Root>
        )}

        <HStack gap="3">
          <Button
            flex="1"
            disabled={offline}
            onClick={() => callVacuumService(vacuum.entityId, primary.service)}
          >
            {primary.icon}
            {primary.text}
          </Button>
          <Button
            flex="1"
            variant="outline"
            disabled={offline || docked}
            onClick={() => callVacuumService(vacuum.entityId, "return_to_base")}
          >
            <IoHomeOutline />
            Dock
          </Button>
          <Button
            flex="1"
            variant="outline"
            disabled={offline}
            onClick={() => callVacuumService(vacuum.entityId, "locate")}
          >
            <IoLocateOutline />
            Locate
          </Button>
        </HStack>
      </Stack>
    </Board>
  );
}
