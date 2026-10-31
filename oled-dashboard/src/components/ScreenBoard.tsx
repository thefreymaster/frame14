import { useRef, useState } from "react";
import { Field, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { IoPowerOutline } from "react-icons/io5";
import { useDesktop } from "../hooks/useDesktop";
import {
  MAX_BRIGHTNESS,
  saveDarkHours,
  saveScreenSchedule,
  setScreen,
  setScreenBrightness,
  useScreen,
  type DarkHours,
  type ScreenSchedule,
} from "../lib/screen";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { toaster } from "./ui/toaster";

const TIME = /^\d\d:\d\d$/;
// While the slider is dragged the frames follow it this often; the release
// sends the final level.
const DRAG_SEND_MS = 150;

/**
 * /control's Screen card (0.129): the frames' screen. A switch turns it off
 * and on now, through Fully Kiosk Browser on each frame — the call a Home
 * Assistant automation makes, GET /api/screen/:state — and a schedule sets
 * the hours it is on, which the add-on keeps and runs itself (screen.js):
 * the screen goes on and off at those times, and the switch works in
 * between. On a phone and on the frame itself (not a desktop, 0.131) there
 * is also a brightness slider, live as it is dragged, and the dark hours —
 * a range during which the screen is at its darkest, the slider's level
 * back at their end. All of it is the frames' and reads the same on every
 * device (lib/screen, over the socket). Under Display on a phone.
 */
export function ScreenBoard() {
  const { state, schedule, brightness, dark } = useScreen();
  const desktop = useDesktop();
  // The level under the thumb while dragging; the store's otherwise.
  const [dragging, setDragging] = useState<number | null>(null);
  const lastSent = useRef(0);
  const level = dragging ?? brightness;

  async function saveSchedule(next: ScreenSchedule) {
    if (!(await saveScreenSchedule(next))) {
      toaster.create({
        title: "The schedule wasn't saved",
        description: "The on and off times have to be different.",
        type: "error",
      });
    }
  }

  async function saveDark(next: DarkHours) {
    if (!(await saveDarkHours(next))) {
      toaster.create({
        title: "The dark hours weren't saved",
        description: "The from and until times have to be different.",
        type: "error",
      });
    }
  }

  function send(next: number, final: boolean) {
    const now = Date.now();
    if (!final && now - lastSent.current < DRAG_SEND_MS) return;
    lastSent.current = now;
    void setScreenBrightness(next);
  }

  function timeField(label: string, value: string, onChange: (value: string) => void) {
    return (
      <Field.Root>
        <Field.Label>{label}</Field.Label>
        <Input
          type="time"
          value={value}
          onChange={(e) => {
            const next = e.target.value;
            if (TIME.test(next) && next !== value) onChange(next);
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

        {!desktop && (
          <Field.Root>
            <HStack width="100%" gap="4" align="flex-end">
              <Slider
                flex="1"
                min={0}
                max={MAX_BRIGHTNESS}
                step={1}
                value={[level ?? MAX_BRIGHTNESS]}
                label="Brightness"
                aria-label={["Brightness"]}
                onValueChange={(d) => {
                  const next = d.value[0];
                  setDragging(next);
                  send(next, false);
                }}
                onValueChangeEnd={(d) => {
                  setDragging(null);
                  send(d.value[0], true);
                }}
              />
              <Text textStyle="sm" minW="3rem" textAlign="end" pb="1">
                {level === null ? "—" : `${Math.round((level / MAX_BRIGHTNESS) * 100)}%`}
              </Text>
            </HStack>
            <Field.HelperText>
              The frames&apos; brightness, through Fully. For a level to hold,
              the tablet&apos;s adaptive brightness has to be off.
            </Field.HelperText>
          </Field.Root>
        )}

        <Field.Root>
          <Switch
            checked={schedule.enabled}
            onCheckedChange={(e) => void saveSchedule({ ...schedule, enabled: e.checked })}
          >
            On a schedule
          </Switch>
          <Field.HelperText>
            The hours the screen is on: it turns on and off at these times,
            and the switch above works in between.
          </Field.HelperText>
        </Field.Root>

        <HStack gap="4" align="flex-start">
          {timeField("On at", schedule.on, (on) => void saveSchedule({ ...schedule, on }))}
          {timeField("Off at", schedule.off, (off) => void saveSchedule({ ...schedule, off }))}
        </HStack>

        {!desktop && (
          <>
            <Field.Root>
              <Switch
                checked={dark.enabled}
                onCheckedChange={(e) => void saveDark({ ...dark, enabled: e.checked })}
              >
                Dark hours
              </Switch>
              <Field.HelperText>
                Between these times the screen is at its darkest; the
                brightness above comes back at the end.
              </Field.HelperText>
            </Field.Root>

            <HStack gap="4" align="flex-start">
              {timeField("Dark from", dark.from, (from) => void saveDark({ ...dark, from }))}
              {timeField("Dark until", dark.to, (to) => void saveDark({ ...dark, to }))}
            </HStack>
          </>
        )}
      </Stack>
    </Board>
  );
}
