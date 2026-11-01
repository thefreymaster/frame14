import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  HStack,
  List,
  Portal,
  Progress,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  IoCloudDownloadOutline,
  IoCubeOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { installSoftware, useSoftware } from "../hooks/useSoftware";
import { reloadApp, useAppVersion } from "../lib/appVersion";
import { useConnectionStatus } from "../lib/connection";
import { Board } from "./Board";
import * as Modal from "./Modal";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { DataListItem, DataListRoot } from "./ui/data-list";
import { toaster } from "./ui/toaster";

// An install that hasn't come back as the installed version by then has
// failed somewhere out of sight (the add-on's log says where).
const INSTALLING_MS = 5 * 60_000;
// An install still under way this long after it began gets the Try again
// button (0.140.1) without waiting for the connection to be given up on: the
// download and the restart are over in well under a minute on this LAN.
const STUCK_MS = 2 * 60_000;

/** A CHANGELOG bullet's kind, set off from its words. */
const NOTE_KIND = /^(Added|Changed|Fixed|Removed|Deprecated|Security):\s*/;

/**
 * The version to come's CHANGELOG section as rows: each bullet (its "- "
 * dropped) or paragraph, the kind it leads with on its own (0.136).
 */
function releaseNoteRows(
  notes: string,
): { kind: string | null; text: string }[] {
  return notes
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean)
    .map((line) => {
      const m = NOTE_KIND.exec(line);
      return m
        ? { kind: m[1], text: line.slice(m[0].length) }
        : { kind: null, text: line };
    });
}

/**
 * /control's Software card (since 0.113): the version this page runs, the
 * add-on installed, and the latest in Home Assistant's add-on store, from the
 * add-on's update entity (useSoftware). While the store has a newer one the
 * header carries "Update available" and the body names it with an Install
 * button (since 0.115): after a confirm — whose prompt lists, since 0.136,
 * the version's changes, its section of the CHANGELOG from Home Assistant's
 * release notes (useSoftware's `releaseNotes`; the user: "put the change log
 * in the confirm drawer") — Home Assistant installs it
 * (installSoftware) and the add-on restarts — every screen loses Frame14 for
 * a minute, and this device refreshes to the new version, or asks to, as
 * lib/appVersion does on the reconnect. While it installs — asked from here,
 * or from Home Assistant's own add-on page, since the entity's `in_progress`
 * says so either way (0.136) — an indeterminate Progress bar (0.138: it
 * showed the Supervisor's percentage, which never came on the user's
 * installs), and the header's badge is a blue "Installing" (0.140.1, the
 * user's ask) in place of the green one. When the add-on fails to come back
 * — the connection given up on (lib/connection's "disconnected", a minute
 * down) while it installs, or the install still under way STUCK_MS after it
 * began — a Try again button reloads this device (0.140.1, the user: "when
 * an update is installed and the app tries to come back up but fails, there
 * should be a try again button that just reload the app"; the service
 * worker serves the page while the add-on is away, so a reload always lands
 * somewhere). "Up to date" when the store has
 * nothing newer; no tag when Home Assistant has no update entity for it
 * (outside the add-on). Check for updates (since 0.116) is Home Assistant's
 * own, from here: the store reloaded and the entity refreshed (useSoftware's
 * `check`), a toast saying what it found — the Supervisor does this on its
 * own every few hours, so a version just published needs it.
 */
export function SoftwareBoard() {
  const page = useAppVersion();
  const { loading, installed, update, check } = useSoftware();
  const [confirming, setConfirming] = useState(false);
  const [checking, setChecking] = useState(false);
  // The version asked for, until it is the installed one (or too long passes).
  const [installing, setInstalling] = useState<string | null>(null);
  const available = update?.available === true && update.latest != null;
  const dash = loading ? "—" : null;
  // Installing: asked from here, or Home Assistant says so.
  const busy = installing != null || update?.inProgress === true;
  // The add-on hasn't come back: the connection given up on while it
  // installs, or the install under way for too long (overdue, set STUCK_MS
  // after it began) — the Try again button's cue.
  const status = useConnectionStatus();
  const [overdue, setOverdue] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => setOverdue(true), STUCK_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  if (!busy && overdue) setOverdue(false);
  const stuck = busy && (overdue || status === "disconnected");
  const notes =
    available && update.releaseNotes
      ? releaseNoteRows(update.releaseNotes)
      : [];

  if (
    installing &&
    (installed === installing || page.installed === installing)
  ) {
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

  async function checkNow() {
    setChecking(true);
    try {
      const info = await check();
      const found = info.update?.available ? info.update.latest : null;
      toaster.create({
        type: found ? "success" : "info",
        title: found ? `Frame14 ${found} is available` : "Up to date",
        description: found
          ? "Install it from the Software card."
          : `Nothing newer than ${info.update?.latest ?? info.installed} in the add-on store.`,
        duration: 6000,
      });
    } catch (e) {
      toaster.create({
        type: "error",
        title: "Couldn't check for updates",
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <Board
      title={<SectionTitle icon={<IoCubeOutline />}>Software</SectionTitle>}
      action={
        busy ? (
          <Badge colorPalette="brand">Installing</Badge>
        ) : available ? (
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
      {busy ? (
        <Stack gap="3" mt="4">
          <Text textStyle="sm" color="fg.muted">
            Installing Frame14 {installing ?? update?.latest ?? "?"}. Home
            Assistant downloads it, the add-on restarts, and this device
            refreshes to it once it's back.
          </Text>
          <Progress.Root value={null} size="sm">
            {/* The track carries the progressbar role, so the name goes here. */}
            <Progress.Track aria-label="Install progress">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
          {stuck && (
            <HStack gap="3" wrap="wrap" align="center">
              <Text textStyle="sm" color="fg.muted" flex="1" minW="12rem">
                {status === "disconnected"
                  ? "Frame14 hasn't come back yet."
                  : "This is taking longer than it should."}{" "}
                Try again reloads this device.
              </Text>
              <Button size="sm" variant="outline" onClick={reloadApp}>
                <IoRefreshOutline />
                Try again
              </Button>
            </HStack>
          )}
        </Stack>
      ) : (
        <>
          {available && (
            <Text textStyle="sm" color="fg.muted" mt="4">
              Frame14 {update.latest} is ready to download.
            </Text>
          )}
          {update && (
            <HStack mt={available ? "3" : "4"} gap="3" wrap="wrap">
              {available && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirming(true)}
                >
                  <IoCloudDownloadOutline />
                  Install {update.latest}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                loading={checking}
                loadingText="Checking"
                onClick={() => void checkNow()}
              >
                <IoRefreshOutline />
                Check for updates
              </Button>
            </HStack>
          )}
        </>
      )}

      <Modal.Root
        role="alertdialog"
        open={confirming}
        onOpenChange={(e) => setConfirming(e.open)}
        placement="center"
        size="sm"
      >
        <Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.Content>
              <Modal.Header>
                <Modal.Title>Install Frame14 {update?.latest}?</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Text color="fg.muted">
                  Home Assistant downloads it and restarts the add-on. Every
                  screen loses Frame14 for a minute or so and comes back on the
                  new version.
                </Text>
                {notes.length > 0 && (
                  <List.Root
                    aria-label={`What's new in ${update?.latest}`}
                    gap="1"
                    mt="4"
                    ps="4"
                    textStyle="sm"
                    color="fg.muted"
                  >
                    {notes.map((row, i) => (
                      <List.Item key={i}>
                        {row.kind && (
                          <Text as="span" fontWeight="medium" color="fg">
                            {row.kind}:{" "}
                          </Text>
                        )}
                        {row.text}
                      </List.Item>
                    ))}
                  </List.Root>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Modal.ActionTrigger asChild>
                  <Button variant="outline">Not now</Button>
                </Modal.ActionTrigger>
                <Button onClick={() => void install()}>Install</Button>
              </Modal.Footer>
            </Modal.Content>
          </Modal.Positioner>
        </Portal>
      </Modal.Root>
    </Board>
  );
}
