import { Grid, Progress, SimpleGrid, Stack, Stat, Text } from "@chakra-ui/react";
import { useConnectionInfo } from "../hooks/useConnectionInfo";
import { fmtWhen } from "../lib/format";
import {
  fmtData,
  fmtMs,
  NO_READING,
  type SpeedPhase,
  type SpeedProgress,
  type SpeedReading,
  type SpeedResult,
} from "../lib/speedTest";
import { Board } from "./Board";
import { SpeedReadout } from "./SpeedReadout";

/**
 * The two speeds side by side from this width of the card's body, else
 * stacked: by the card's width, as the Unraid server's meters.
 */
const SPEEDS_SIDE_BY_SIDE = "@container (min-width: 36rem)";

/** What the run is doing, under the speeds while it does it. */
const PHASE_STATUS: Record<SpeedPhase, string> = {
  ping: "Timing the round trip…",
  download: "Testing the download…",
  upload: "Testing the upload…",
};

/** "3:45 PM", "yesterday", "Monday", "Nov 3": when the last test ran, mid-sentence. */
const testedWhen = (at: number) =>
  fmtWhen(new Date(at)).replace(/^Yesterday$/, "yesterday");

/**
 * The Speed test page's card (0.167.0): the download and the upload as two
 * large figures over their traces (SpeedReadout), a line saying what the run
 * is doing over its progress bar — or, between runs, when the last one was
 * and the data it used — and the smaller figures: the round trip and its
 * jitter, and the two ends of what was measured, this device's address as
 * the server sees it and the server the page came from. While a test runs
 * (`progress`) every figure is the run's so far; otherwise they are the last
 * result's, kept on this device, or "—" before any.
 */
export function SpeedTestBoard({
  progress,
  result,
}: {
  /** The run under way, or null. */
  progress: SpeedProgress | null;
  /** The last test finished on this device, or null. */
  result: SpeedResult | null;
}) {
  const info = useConnectionInfo(true).data;
  const shown: SpeedReading = progress ?? result ?? NO_READING;
  const phase = progress?.phase;

  const status = progress
    ? PHASE_STATUS[progress.phase]
    : result
      ? `Last tested ${testedWhen(result.at)} · ${fmtData(result.downloadBytes + result.uploadBytes)} of data used`
      : "Measures the connection between this device and the Frame14 server, not the internet beyond it.";

  const stats = [
    { label: "Ping", value: fmtMs(shown.ping) },
    { label: "Jitter", value: fmtMs(shown.jitter) },
    { label: "This device", value: info?.client.address ?? "—" },
    { label: "Server", value: window.location.host },
  ];

  return (
    <Board>
      <Stack
        gap="6"
        css={{ containerType: "inline-size" }}
        data-speed-test={progress ? "running" : result ? "done" : "idle"}
        data-speed-phase={phase}
      >
        <Grid
          gap="6"
          css={{
            gridTemplateColumns: "minmax(0, 1fr)",
            [SPEEDS_SIDE_BY_SIDE]: {
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          <SpeedReadout
            kind="download"
            value={shown.download}
            trace={shown.downloadTrace}
            active={phase === "download"}
          />
          <SpeedReadout
            kind="upload"
            value={shown.upload}
            trace={shown.uploadTrace}
            active={phase === "upload"}
          />
        </Grid>

        <Stack gap="2">
          <Text textStyle="sm" color="fg.muted" data-speed-status="">
            {status}
          </Text>
          {/* Kept in the layout between runs, so starting one moves nothing. */}
          <Progress.Root
            value={progress ? progress.progress * 100 : 0}
            size="xs"
            visibility={progress ? "visible" : "hidden"}
          >
            <Progress.Track aria-label="Speed test progress">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Stack>

        <SimpleGrid minChildWidth="9rem" gap="4">
          {stats.map((s) => (
            <Stat.Root key={s.label} size="sm" minW="0">
              <Stat.Label>{s.label}</Stat.Label>
              <Stat.ValueText truncate title={s.value}>
                {s.value}
              </Stat.ValueText>
            </Stat.Root>
          ))}
        </SimpleGrid>
      </Stack>
    </Board>
  );
}
