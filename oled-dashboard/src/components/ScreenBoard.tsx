import { Field, HStack, Input, Stack } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import {
  saveScreenSchedule,
  setScreen,
  useScreen,
  type ScreenSchedule,
} from "../lib/screen";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Switch } from "./ui/switch";
import { toaster } from "./ui/toaster";

const TIME = /^\d\d:\d\d$/;

/**
 * /control's Screen card (0.129): the frames' screen. A switch turns it off
 * and on now, through Fully Kiosk Browser on each frame — the call a Home
 * Assistant automation makes, GET /api/screen/:state — and a schedule sets
 * the hours it is on, which the add-on keeps and runs itself (screen.js):
 * the screen goes on and off at those times, and the switch works in
 * between. Both are the frames' and read the same on every device
 * (lib/screen, over the socket). Under Display on a phone.
 */
export function ScreenBoard() {
  const { state, schedule } = useScreen();

  async function save(next: ScreenSchedule) {
    if (!(await saveScreenSchedule(next))) {
      toaster.create({
        title: "The schedule wasn't saved",
        description: "The on and off times have to be different.",
        type: "error",
      });
    }
  }

  function timeField(label: string, key: "on" | "off") {
    return (
      <Field.Root>
        <Field.Label>{label}</Field.Label>
        <Input
          type="time"
          value={schedule[key]}
          onChange={(e) => {
            const value = e.target.value;
            if (TIME.test(value) && value !== schedule[key]) {
              void save({ ...schedule, [key]: value });
            }
          }}
        />
      </Field.Root>
    );
  }

  return (
    <Board title={<SectionTitle icon={<IoPowerOutline />}>Screen</SectionTitle>}>
      <Stack gap="5">
        <Field.Root>
          <Switch
            checked={state === "on"}
            onCheckedChange={(e) => void setScreen(e.checked ? "on" : "off")}
          >
            Screen on
          </Switch>
          <Field.HelperText>
            The frames&apos; screen, through Fully Kiosk Browser. Off, it stays
            dark until it&apos;s turned on again here, by the schedule, or by
            Home Assistant.
          </Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(e) => void save({ ...schedule, enabled: e.checked })}
          >
            On a schedule
          </Switch>
          <Field.HelperText>
            The hours the screen is on: it turns on and off at these times,
            and the switch above works in between.
          </Field.HelperText>
        </Field.Root>

        <HStack gap="4" align="flex-start">
          {timeField("On at", "on")}
          {timeField("Off at", "off")}
        </HStack>
      </Stack>
    </Board>
  );
}
