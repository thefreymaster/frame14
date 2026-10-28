import { Badge, Text } from "@chakra-ui/react";
import { useSoftware } from "../hooks/useSoftware";
import { useAppVersion } from "../lib/appVersion";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { DataListItem, DataListRoot } from "./ui/data-list";

/**
 * /control's Software card (since 0.113): the version this page runs, the
 * add-on installed, and the latest in Home Assistant's add-on store, from the
 * add-on's update entity (useSoftware). While the store has a newer one the
 * header carries "Update available" and the body names it — it is installed
 * from the add-on's page in Home Assistant, not from here; the Updates card
 * below is about this device taking it once installed. "Up to date" when the
 * store has nothing newer; no tag when Home Assistant has no update entity
 * for it (outside the add-on).
 */
export function SoftwareBoard() {
  const page = useAppVersion();
  const { loading, installed, update } = useSoftware();
  const available = update?.available === true && update.latest != null;
  const dash = loading ? "—" : null;

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
      {available && (
        <Text textStyle="sm" color="fg.muted" mt="4">
          Frame14 {update.latest} is ready to download. Open the add-on in Home
          Assistant (Settings › Add-ons › Frame14) and press Update.
        </Text>
      )}
    </Board>
  );
}
