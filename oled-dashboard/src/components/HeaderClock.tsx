import { useEffect, useState } from "react";
import { Text } from "@chakra-ui/react";

function timeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * The header's clock ("1:45 PM"), the device's own time. Checks every second
 * but only re-renders when the minute turns over (same string, no update).
 */
export function HeaderClock() {
  const [label, setLabel] = useState(() => timeLabel(new Date()));

  useEffect(() => {
    const id = setInterval(() => setLabel(timeLabel(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Text
      textStyle={{ base: "sm", md: "md" }}
      fontWeight="medium"
      fontVariantNumeric="tabular-nums"
      whiteSpace="nowrap"
    >
      {label}
    </Text>
  );
}
