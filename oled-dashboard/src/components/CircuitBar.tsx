import { HStack, Progress, Text } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";

// A highlight gliding along the filled bar, left to right (0.138, the user's
// ask: a circuit pulling power shows it moving), as PowerFlow's dots run
// along its wires: a soft band a third of the bar wide, through in 2.4s.
const flow = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(300%); }
`;
const FLOW_MS = 2400;

function fmtW(watts: number | null): string {
  if (watts == null || isNaN(watts)) return "--";
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${Math.round(watts)} W`;
}

interface Props {
  name: string;
  watts: number | null;
  maxWatts: number;
  kwhToday?: number | null;
  dim?: boolean;
}

/**
 * One circuit: a Progress bar scaled against the largest draw. While it
 * draws anything (and isn't the dimmed balance) a highlight runs along the
 * bar left to right — `data-flowing` on the range; none under reduced
 * motion.
 */
export function CircuitBar({
  name,
  watts,
  maxWatts,
  kwhToday,
  dim = false,
}: Props) {
  const value = watts ?? 0;
  const pct = maxWatts > 0 ? Math.min(100, (value / maxWatts) * 100) : 0;
  const flowing = value > 0 && !dim;

  return (
    <Progress.Root
      value={pct}
      colorPalette={dim ? "gray" : "blue"}
      width="100%"
    >
      <HStack justify="space-between" mb="2">
        <Progress.Label color={dim ? "fg.muted" : undefined} truncate>
          {name}
        </Progress.Label>
        <HStack gap="3" flexShrink={0}>
          {kwhToday != null && (
            <Text textStyle="sm" color="fg.muted">
              {kwhToday.toFixed(1)} kWh
            </Text>
          )}
          <Progress.ValueText
            color={value > 0 && !dim ? undefined : "fg.muted"}
          >
            {fmtW(watts)}
          </Progress.ValueText>
        </HStack>
      </HStack>
      <Progress.Track>
        <Progress.Range
          data-flowing={flowing ? "" : undefined}
          position="relative"
          overflow="hidden"
          css={{
            "&[data-flowing]::after": {
              content: '""',
              position: "absolute",
              insetY: 0,
              left: 0,
              width: "33%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent)",
              animation: `${flow} ${FLOW_MS}ms linear infinite`,
            },
          }}
          _motionReduce={{ "&::after": { animation: "none" } }}
        />
      </Progress.Track>
    </Progress.Root>
  );
}
