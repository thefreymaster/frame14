import {
  Box,
  Card,
  Center,
  HStack,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { HomeEnergy } from "../hooks/useHomeData";
import { useEnergyToday } from "../hooks/useEnergyToday";
import { ENERGY_COLORS, coverage, fmtKwh } from "../lib/energy";
import { PanelDialog } from "./PanelDialog";
import { PowerFlow } from "./PowerFlow";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { TodayPowerChart } from "./TodayPowerChart";

/**
 * The energy card's detail: where the power is going now (PowerFlow), today's
 * power curve, and today's totals, each split by the grid: the solar into
 * what the house used and what went out, the house's use into what the
 * solar covered and what came in. The curve and the split come from
 * /api/energy/today, fetched while the dialog is open; until it answers the
 * totals stand alone.
 */
export function EnergyDialog({
  energy,
  open,
  onClose,
}: {
  energy: HomeEnergy;
  open: boolean;
  onClose: () => void;
}) {
  const today = useEnergyToday(open);
  const { productionToday: produced, consumptionToday: used } = energy;
  // The totals are /api/energy's; only the self-used share comes from the
  // curve, so the two halves of each bar add up to the total above it.
  const self =
    today.data?.selfConsumed != null
      ? Math.max(0, Math.min(today.data.selfConsumed, produced, used))
      : null;

  return (
    <PanelDialog open={open} onClose={onClose} title="Energy">
      <Stack gap="3">
        <SectionTitle>Now</SectionTitle>
        <Well>
          <PowerFlow energy={energy} />
        </Well>
      </Stack>

      <Stack gap="3">
        <HStack justify="space-between" align="baseline" gap="3">
          <SectionTitle>Today</SectionTitle>
          {used > 0 && (
            <Text color="fg.muted" whiteSpace="nowrap">
              Solar covered{" "}
              <Text as="span" color="fg" fontWeight="semibold">
                {Math.round(coverage(energy))}%
              </Text>
            </Text>
          )}
        </HStack>

        <Well>
          {today.data ? (
            <TodayPowerChart
              points={today.data.points}
              start={Date.parse(today.data.start)}
              end={Date.parse(today.data.end)}
              live={{
                production: energy.currentProduction,
                consumption: energy.currentConsumption,
              }}
            />
          ) : (
            <Center minH="12rem">
              {today.isError ? (
                <Text color="fg.muted">Today's curve isn't available</Text>
              ) : (
                <Spinner aria-label="Loading today's power" />
              )}
            </Center>
          )}
        </Well>

        <Well>
          <Stack gap="5">
            <Split
              label="Solar produced"
              total={produced}
              parts={
                self == null
                  ? null
                  : [
                      { label: "used at home", value: self, color: "solar" },
                      {
                        label: "sent to grid",
                        value: produced - self,
                        color: "export",
                      },
                    ]
              }
            />
            <Split
              label="Home used"
              total={used}
              parts={
                self == null
                  ? null
                  : [
                      { label: "from solar", value: self, color: "solar" },
                      {
                        label: "from grid",
                        value: used - self,
                        color: "import",
                      },
                    ]
              }
            />
          </Stack>
        </Well>
      </Stack>
    </PanelDialog>
  );
}

function Well({ children }: { children: React.ReactNode }) {
  return (
    <Card.Root size="sm" variant="subtle" borderRadius="sm">
      <Card.Body>{children}</Card.Body>
    </Card.Root>
  );
}

interface Part {
  label: string;
  value: number;
  color: keyof typeof ENERGY_COLORS;
}

/**
 * A day's total and, once the curve has answered, a bar split into its parts
 * with a keyed value under each. Segments sit 2px apart; an empty part has
 * no segment.
 */
function Split({
  label,
  total,
  parts,
}: {
  label: string;
  total: number;
  parts: Part[] | null;
}) {
  const shown = parts?.filter((p) => p.value > 0) ?? [];
  return (
    <Stack gap="2.5">
      <HStack justify="space-between" align="baseline" gap="3">
        <Text color="fg.muted">{label}</Text>
        <Text textStyle="xl" fontWeight="semibold" whiteSpace="nowrap">
          {fmtKwh(total)}{" "}
          <Text as="span" textStyle="sm" fontWeight="normal" color="fg.muted">
            kWh
          </Text>
        </Text>
      </HStack>
      {parts && (
        <>
          <HStack
            gap="2px"
            height="2.5"
            rounded="xs"
            overflow="hidden"
            bg={shown.length ? undefined : "bg.emphasized"}
            aria-hidden
          >
            {shown.map((p) => (
              <Box
                key={p.label}
                height="100%"
                flexGrow={p.value}
                flexBasis="0"
                minW="1"
                bg={ENERGY_COLORS[p.color]}
              />
            ))}
          </HStack>
          <HStack gap="5" rowGap="1" wrap="wrap" textStyle="sm">
            {parts.map((p) => (
              <HStack key={p.label} gap="2" whiteSpace="nowrap">
                <Box boxSize="2.5" rounded="xs" bg={ENERGY_COLORS[p.color]} />
                <Text fontWeight="semibold">{fmtKwh(p.value)} kWh</Text>
                <Text color="fg.muted">{p.label}</Text>
              </HStack>
            ))}
          </HStack>
        </>
      )}
    </Stack>
  );
}
