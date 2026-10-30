import { Field } from "@chakra-ui/react";
import { reloadApp, useAppVersion } from "../lib/appVersion";
import { setAutoRefresh, useAutoRefresh } from "../lib/autoRefresh";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Switch } from "./ui/switch";
import { IoCloudDownloadOutline } from "react-icons/io5";

/**
 * /control's Updates card: this device's auto refresh. On, the page reloads
 * itself as soon as a newer add-on is installed (lib/appVersion's check);
 * off, the toast with the Refresh button asks first. Turning it on while an
 * update is already waiting takes it at once.
 */
export function UpdatesBoard() {
  const autoRefresh = useAutoRefresh();
  const version = useAppVersion();

  return (
    <Board
      title={<SectionTitle icon={<IoCloudDownloadOutline />}>Updates</SectionTitle>}
    >
      <Field.Root>
        <Switch
          checked={autoRefresh}
          onCheckedChange={(e) => {
            setAutoRefresh(e.checked);
            if (e.checked && version.outdated) reloadApp();
          }}
        >
          Refresh automatically
        </Switch>
        <Field.HelperText>
          Reload this device as soon as a new version of Frame14 is installed,
          instead of asking first.
        </Field.HelperText>
      </Field.Root>
    </Board>
  );
}
