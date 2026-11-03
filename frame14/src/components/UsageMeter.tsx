import { HStack, Icon, Progress, Skeleton, Text } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";

/** The bar turns orange from here, and red from DANGER_PCT. */
const WARN_PCT = 75;
const DANGER_PCT = 90;

/**
 * A share of something in use — the Unraid server's CPU or memory (0.151.0):
 * the percentage as a big figure with its name beside it, over a bar (the
 * logo's blue, orange from WARN_PCT, red from DANGER_PCT) and a line of
 * detail. A Skeleton stands in for the figure until there is a reading.
 */
export function UsageMeter({
  label,
  icon,
  value,
  detail,
  loading = false,
}: {
  /** "CPU", "Memory": the figure's name, and the bar's ("CPU usage"). */
  label: string;
  icon: React.ReactNode;
  value: number | null;
  detail?: string | null;
  loading?: boolean;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const palette =
    pct >= DANGER_PCT ? "red" : pct >= WARN_PCT ? "orange" : undefined;

  return (
    <Progress.Root value={pct} colorPalette={palette} size="lg">
      <HStack justify="space-between" align="baseline" gap="4">
        {loading ? (
          <Skeleton height="10" width="8rem" />
        ) : (
          <Text
            textStyle={{ base: "4xl", md: "5xl" }}
            fontWeight="semibold"
            lineHeight="1"
          >
            {value != null ? (
              <NumberFlow
                value={Math.round(value * 10) / 10}
                format={{ maximumFractionDigits: 1 }}
                suffix="%"
              />
            ) : (
              "—"
            )}
          </Text>
        )}
        <HStack gap="1.5" color="fg.muted" textStyle="lg">
          <Icon boxSize="5">{icon}</Icon>
          <Text>{label}</Text>
        </HStack>
      </HStack>
      <Progress.Track mt="4" aria-label={`${label} usage`}>
        <Progress.Range />
      </Progress.Track>
      {detail && (
        <Text textStyle="sm" color="fg.muted" mt="2">
          {detail}
        </Text>
      )}
    </Progress.Root>
  );
}
