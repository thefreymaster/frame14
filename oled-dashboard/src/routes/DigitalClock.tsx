import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(now.getMinutes());
  const ampm = rawHours < 12 ? "am" : "pm";

  return (
    <Box
      width="100%"
      height="100vh"
      bg="#000"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
    >
      <Text
        fontSize="24vmin"
        fontWeight="200"
        letterSpacing="-0.03em"
        color="white"
        lineHeight="1"
      >
        {hours}:{minutes}
        <Text
          as="span"
          fontSize="8vmin"
          fontWeight="300"
          color="gray.500"
          ml="2vmin"
        >
          {ampm}
        </Text>
      </Text>

      <Text
        fontSize="4vmin"
        color="gray.600"
        fontWeight="300"
        letterSpacing="0.04em"
        mt="3vmin"
      >
        {DAYS[now.getDay()]}, {MONTHS[now.getMonth()]} {now.getDate()}
      </Text>
    </Box>
  );
}
