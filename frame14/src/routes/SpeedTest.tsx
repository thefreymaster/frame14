import { Button } from "@chakra-ui/react";
import { IoPlay, IoSpeedometerOutline, IoStop } from "react-icons/io5";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { SpeedTestBoard } from "../components/SpeedTestBoard";
import { useSpeedTest } from "../hooks/useSpeedTest";

/**
 * How fast this device and the Frame14 server reach each other (0.167.0):
 * the Wi-Fi, the LAN, a tunnel from outside — the path every page's data and
 * every camera's picture takes — and nothing of the internet beyond the
 * server. The header's button starts a test, which times the round trip and
 * then pulls and pushes data for five seconds each (lib/speedTest, against
 * /api/speedtest), and stops one under way; the card under it has the
 * figures as they come in, and afterwards the last result, kept on this
 * device (SpeedTestBoard). Nothing runs until asked, and a test ends with
 * the page.
 *
 * The page is this device's own: a frame's tap on its nav entry moves no
 * other frame (LandscapeNav's LOCAL_ONLY_PATHS), and a remote has the entry
 * once it is turned on in Settings.
 */
export function SpeedTest() {
  const { progress, result, start, stop } = useSpeedTest();
  const running = progress != null;

  return (
    <PageShell>
      <PageHeader
        icon={<IoSpeedometerOutline />}
        title="Speed test"
        actions={
          <Button
            size="xs"
            variant={running ? "outline" : "solid"}
            // Taller than the title row; don't let it grow the header.
            my="-1"
            onClick={running ? stop : start}
          >
            {running ? <IoStop /> : <IoPlay />}
            {running ? "Stop" : result ? "Test again" : "Start"}
          </Button>
        }
      />
      <SpeedTestBoard progress={progress} result={result} />
    </PageShell>
  );
}
