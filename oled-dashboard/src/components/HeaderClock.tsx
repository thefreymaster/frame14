import { useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

// Minutes always show two digits ("07"), so the tens digit is a real digit
// that rolls too; digit position 1 is the tens.
const TWO_DIGITS = { minimumIntegerDigits: 2 };
const TENS_UP_TO_5 = { 1: { max: 5 } };

/** Minutes since the epoch: the clock only changes when this does. */
const minuteOf = (date: Date) => Math.floor(date.getTime() / 60_000);

/**
 * The header's clock ("1:45 PM"), the device's own time. Hours and minutes are
 * NumberFlows that roll forward as the minute turns over, grouped so a change
 * that carries (12:59 → 1:00) animates as one. It checks every second but only
 * re-renders when the minute changes.
 */
export function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow((prev) => (minuteOf(prev) === minuteOf(next) ? prev : next));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();

  return (
    <Text
      as="span"
      textStyle={{ base: "sm", md: "md" }}
      fontWeight="medium"
      fontVariantNumeric="tabular-nums"
      whiteSpace="nowrap"
    >
      <NumberFlowGroup>
        <NumberFlow value={rawHours % 12 || 12} trend={1} />:
        <NumberFlow
          value={now.getMinutes()}
          format={TWO_DIGITS}
          digits={TENS_UP_TO_5}
          trend={1}
        />
      </NumberFlowGroup>{" "}
      {rawHours < 12 ? "AM" : "PM"}
    </Text>
  );
}
