import { Box } from "@chakra-ui/react";
import { IoSyncOutline } from "react-icons/io5";
import { useSoftware } from "../hooks/useSoftware";
import { HeaderMenu } from "./HeaderMenu";
import { DataListItem, DataListRoot } from "./ui/data-list";

/**
 * The header's sign that an update is being installed (0.181.0, the user:
 * "When an update is being installed, show a spinning arrows icon animated
 * in the header with a tool tip of a new version v0.180.0 is being
 * installed"): a pair of arrows chasing each other round, among the status
 * icons — it says, it doesn't do —, for as long as Home Assistant says the
 * add-on's update is under way (useSoftware's `inProgress`, the update
 * entity's own word, live over the socket), on every device and whoever
 * started it: this device's Software card, another's, or Home Assistant's
 * add-on page. A newer version merely waiting in the store shows nothing.
 *
 * It turns the way its arrows point, and stands still under reduced motion
 * (HeaderMenu's `turning`). A pointer resting on it is told which version
 * in a tooltip; a tap opens the status icons' small menu with the same —
 * a touch screen, the frame's and a phone's, has no tooltip to show. The
 * page keeps the last state it heard while the add-on restarts, so the
 * arrows turn through the restart, until the page loads itself afresh as
 * the new version (lib/appVersion).
 *
 * Where the header has no room for one more icon — a phone with every
 * appliance running — the arrows are what gives way (`data-header-install`,
 * lib/headerFit's `bare`): the Software card says it too. The box that
 * carries the mark takes no part in the layout itself.
 */
export function SoftwareInstallIndicator() {
  const { installed, update } = useSoftware();
  if (!update?.inProgress) return null;
  const version = update.latest ? `v${update.latest}` : null;
  const saying = version
    ? `A new version ${version} is being installed`
    : "A new version is being installed";
  const from = update.installed ?? installed;
  return (
    <Box display="contents" data-header-install="">
      <HeaderMenu
        icon={<IoSyncOutline />}
        label={saying}
        tooltip={saying}
        title="Software update"
        color="fg"
        turning
      >
        <DataListRoot orientation="horizontal" size="sm" gap="1.5">
          <DataListItem label="Status" value="Installing" />
          <DataListItem label="New version" value={version ?? "—"} />
          <DataListItem label="Installed" value={from ? `v${from}` : "—"} />
        </DataListRoot>
      </HeaderMenu>
    </Box>
  );
}
