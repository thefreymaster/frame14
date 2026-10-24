import { useEffect, useState } from "react";
import { Button, Dialog, HStack, Portal, Text } from "@chakra-ui/react";
import { IoPause, IoPlay, IoStop } from "react-icons/io5";
import { pressButton } from "../lib/callService";

// Stop spinning if the printer still hasn't changed state after this long.
const PENDING_MS = 10_000;

/**
 * The print job's own buttons while one is under way: Pause (Resume while
 * paused) and Stop, which asks first, since a stopped print can't be picked
 * up again. A pressed button spins until the printer's status changes.
 */
export function PrinterControls({
  status,
  pause,
  resume,
  stop,
}: {
  status: string;
  pause: string | null;
  resume: string | null;
  stop: string | null;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Whatever was pressed has taken once the status moves.
  const [pendingStatus, setPendingStatus] = useState(status);
  if (pendingStatus !== status) {
    setPendingStatus(status);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPending(null), PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  function press(id: string) {
    pressButton(id);
    setPending(id);
  }

  const paused = status === "pause";
  const toggle = paused ? resume : pause;
  if (!toggle && !stop) return null;

  return (
    <>
      <HStack gap="3">
        {toggle && (
          <Button
            flex="1"
            variant="outline"
            loading={pending === toggle}
            onClick={() => press(toggle)}
          >
            {paused ? <IoPlay /> : <IoPause />}
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
        {stop && (
          <Button
            flex="1"
            variant="outline"
            colorPalette="red"
            loading={pending === stop}
            onClick={() => setConfirming(true)}
          >
            <IoStop />
            Stop
          </Button>
        )}
      </HStack>

      {stop && (
        <Dialog.Root
          role="alertdialog"
          open={confirming}
          onOpenChange={(e) => setConfirming(e.open)}
          placement="center"
          size="sm"
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Header>
                  <Dialog.Title>Stop the print?</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                  <Text color="fg.muted">
                    The job ends and can't be resumed.
                  </Text>
                </Dialog.Body>
                <Dialog.Footer>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Keep printing</Button>
                  </Dialog.ActionTrigger>
                  <Button
                    colorPalette="red"
                    onClick={() => {
                      setConfirming(false);
                      press(stop);
                    }}
                  >
                    Stop print
                  </Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      )}
    </>
  );
}
