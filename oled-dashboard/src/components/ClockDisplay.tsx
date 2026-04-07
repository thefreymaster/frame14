import { useEffect, useState } from "react";
import { Box, Text } from "@chakra-ui/react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ClockDisplay() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const rawHours = now.getHours();
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(now.getMinutes());
  const ampm = rawHours < 12 ? "AM" : "PM";
  const day = DAYS[now.getDay()];
  const month = MONTHS[now.getMonth()];
  const date = now.getDate();
  const year = now.getFullYear();

  return (
    <Box textAlign="center" width="100%">
      <Text
        fontSize="21vw"
        fontWeight="200"
        letterSpacing="-0.02em"
        color="white"
        lineHeight="1"
      >
        {hours}:{minutes}
        <Text as="span" fontSize="8vw" fontWeight="300" color="gray.500" ml="2vw">
          {ampm}
        </Text>
      </Text>

      <Text
        fontSize="5.5vw"
        color="gray.400"
        mt="3vw"
        letterSpacing="0.08em"
      >
        {day}
      </Text>
      <Text
        fontSize="4.5vw"
        color="gray.600"
        letterSpacing="0.06em"
      >
        {month} {date}, {year}
      </Text>
    </Box>
  );
}
