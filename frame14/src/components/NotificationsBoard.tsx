import { Button, Field } from "@chakra-ui/react";
import { IoNotificationsOutline, IoSend } from "react-icons/io5";
import { usePushNotifications } from "../hooks/usePushNotifications";
import type { PushSupport } from "../lib/push";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Switch } from "./ui/switch";
import { toaster } from "./ui/toaster";

/** Why the switch can't be used here, when it can't. */
const WHY_NOT: Record<Exclude<PushSupport, "available">, string> = {
  unsupported: "This browser can't show notifications from Frame14.",
  insecure:
    "Notifications need Frame14's https address — open it there, rather than at the local http one.",
  install:
    "On an iPhone or iPad, add Frame14 to your Home Screen first (Share, then Add to Home Screen), and turn this on in the app.",
  denied:
    "Notifications are blocked for Frame14. Allow them in this browser's or this phone's settings, then come back.",
};

function failed(title: string, e: unknown) {
  toaster.create({
    type: "error",
    title,
    description: e instanceof Error ? e.message : String(e),
  });
}

/**
 * /control's Notifications card (0.160.0, the user: "Have a switch in
 * settings to allow notifications"): this device gets Home Assistant's
 * `frame14_notify` notifications — the washer, dryer and dishwasher
 * finishing here — even with Frame14 closed (usePushNotifications). Turning
 * it on asks the browser's permission first. Where it can't be on, the
 * switch is off and disabled and the reason is under it. While on, Send a
 * test has the server send one to this device alone; it sits in the card's
 * header, as the other cards' actions do (0.166.1, the user: "Make the test
 * button be in the header instead" — it was a full-width button under the
 * switch).
 */
export function NotificationsBoard() {
  const { support, on, busy, enable, disable, test } = usePushNotifications();
  const available = support === "available";

  return (
    <Board
      title={
        <SectionTitle icon={<IoNotificationsOutline />}>
          Notifications
        </SectionTitle>
      }
      action={
        on && (
          <Button
            size="xs"
            variant="outline"
            // Taller than the title row; don't let it grow the header.
            my="-1"
            loading={busy}
            onClick={() => {
              test()
                .then(() =>
                  toaster.create({
                    type: "info",
                    title: "Test sent",
                    description: "It should arrive on this device in a moment.",
                  }),
                )
                .catch((err) => failed("Couldn't send a test", err));
            }}
          >
            <IoSend />
            Send a test
          </Button>
        )
      }
    >
      <Field.Root disabled={!available}>
        <Switch
          checked={on === true}
          disabled={!available || busy || on == null}
          onCheckedChange={(e) => {
            const work = e.checked ? enable() : disable();
            work.catch((err) =>
              failed(
                e.checked
                  ? "Couldn't turn notifications on"
                  : "Couldn't turn notifications off",
                err,
              ),
            );
          }}
        >
          Allow notifications
        </Switch>
        <Field.HelperText>
          {available
            ? "Home Assistant's alerts on this device, such as the washer, dryer or dishwasher finishing, even when Frame14 is closed."
            : WHY_NOT[support]}
        </Field.HelperText>
      </Field.Root>
    </Board>
  );
}
