import { useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

// Minutes and seconds always show two digits ("07"), so the tens digit is a
// real digit that rolls too; digit position 1 is the tens.
const TWO_DIGITS = { minimumIntegerDigits: 2 };
const TENS_UP_TO_5 = { 1: { max: 5 } };

/**
 * The header's clock ("1:45:07 PM"), the device's own time. Each part is a
 * NumberFlow that rolls forward as the second ticks over, grouped so a change
 * that carries (59 → 00) animates as one.
 */
export function HeaderClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
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
        :
        <NumberFlow
          value={now.getSeconds()}
          format={TWO_DIGITS}
          digits={TENS_UP_TO_5}
          trend={1}
        />
      </NumberFlowGroup>{" "}
      {rawHours < 12 ? "AM" : "PM"}
    </Text>
  );
}
