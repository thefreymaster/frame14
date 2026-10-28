import { useEffect, useState } from "react";
import { Badge, Button, Dialog, Portal, Text } from "@chakra-ui/react";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { installSoftware, useSoftware } from "../hooks/useSoftware";
import { useAppVersion } from "../lib/appVersion";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { DataListItem, DataListRoot } from "./ui/data-list";
import { toaster } from "./ui/toaster";

// An install that hasn't come back as the installed version by then has
// failed somewhere out of sight (the add-on's log says where).
const INSTALLING_MS = 5 * 60_000;

/**
 * /control's Software card (since 0.113): the version this page runs, the
 * add-on installed, and the latest in Home Assistant's add-on store, from the
 * add-on's update entity (useSoftware). While the store has a newer one the
 * header carries "Update available" and the body names it with an Install
 * button (since 0.115): after a confirm, Home Assistant installs it
 * (installSoftware) and the add-on restarts — every screen loses Frame14 for
 * a minute, and this device refreshes to the new version, or asks to, as
 * lib/appVersion does on the reconnect. "Up to date" when the store has
 * nothing newer; no tag when Home Assistant has no update entity for it
 * (outside the add-on).
 */
export function SoftwareBoard() {
  const page = useAppVersion();
  const { loading, installed, update } = useSoftware();
  const [confirming, setConfirming] = useState(false);
  // The version asked for, until it is the installed one (or too long passes).
  const [installing, setInstalling] = useState<string | null>(null);
  const available = update?.available === true && update.latest != null;
  const dash = loading ? "—" : null;

  if (installing && (installed === installing || page.installed === installing)) {
    setInstalling(null);
  }
  useEffect(() => {
    if (!installing) return;
    const timer = setTimeout(() => setInstalling(null), INSTALLING_MS);
    return () => clearTimeout(timer);
  }, [installing]);

  async function install() {
    setConfirming(false);
    const wanted = update?.latest ?? null;
    setInstalling(wanted ?? "?");
    try {
      const version = await installSoftware();
      setInstalling(version ?? wanted ?? "?");
    } catch (e) {
      setInstalling(null);
      toaster.create({
        type: "error",
        title: "Couldn't start the update",
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Board
      title={<SectionTitle>Software</SectionTitle>}
      action={
        available ? (
          <Badge colorPalette="green">Update available</Badge>
        ) : update ? (
          <Badge colorPalette="gray">Up to date</Badge>
        ) : null
      }
    >
      <DataListRoot orientation="horizontal">
        <DataListItem label="This device" value={page.running} />
        <DataListItem label="Installed" value={dash ?? installed} />
        <DataListItem
          label="Latest"
          value={update?.latest ?? dash ?? "Not known"}
        />
      </DataListRoot>
      {installing ? (
        <Text textStyle="sm" color="fg.muted" mt="4">
          Installing Frame14 {installing}. The add-on restarts, and this
          device refreshes to it once it's back.
        </Text>
      ) : (
        available && (
          <>
            <Text textStyle="sm" color="fg.muted" mt="4">
              Frame14 {update.latest} is ready to download.
            </Text>
            <Button
              mt="3"
              size="sm"
              variant="outline"
              onClick={() => setConfirming(true)}
            >
              <IoCloudDownloadOutline />
              Install {update.latest}
            </Button>
          </>
        )
      )}

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
                <Dialog.Title>Install Frame14 {update?.latest}?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text color="fg.muted">
                  Home Assistant downloads it and restarts the add-on. Every
                  screen loses Frame14 for a minute or so and comes back on
                  the new version.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">Not now</Button>
                </Dialog.ActionTrigger>
                <Button onClick={() => void install()}>Install</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Board>
  );
}
