import { Alert, Stack } from "@chakra-ui/react";
import type { WeatherAdvisory } from "../lib/weatherAdvisories";

/**
 * The forecast's heads-ups as stock Alerts, one per advisory (see
 * lib/weatherAdvisories): warnings for a freeze, storms, snow, high winds or
 * a sharp drop, info for rain on the way. Renders nothing with none.
 */
export function WeatherAdvisories({
  advisories,
}: {
  advisories: WeatherAdvisory[];
}) {
  if (advisories.length === 0) return null;
  return (
    <Stack gap="2">
      {advisories.map((advisory) => (
        <Alert.Root
          key={advisory.key}
          status={advisory.status}
          size="sm"
          borderRadius="sm"
        >
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{advisory.title}</Alert.Title>
            <Alert.Description>{advisory.detail}</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      ))}
    </Stack>
  );
}
