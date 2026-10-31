import { Flex, Skeleton, Text } from "@chakra-ui/react";
import { IoThermometerOutline } from "react-icons/io5";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import type { HomeClimate } from "../hooks/useHomeData";
import { Board } from "./Board";
import { ClimateAllOffButton } from "./ClimateAllOffButton";
import { ClimateTiles } from "./ClimateTiles";
import { ClimateSkeleton } from "./skeletons/ClimateSkeleton";
import { climateTempRange, isClimateOn } from "../lib/hvac";

/**
 * The Home page's Climate card: a Board holding the thermostats as tiles
 * (ClimateTiles, since 0.110 the tile and its dialog live there, shared with
 * /climate), with All off in its header while any unit is on. Beside the
 * title, in grey like the Calendar card's count, the rooms' temperatures as
 * a range (0.131), so the card says something collapsed.
 */
export function ClimateSection({
  climate,
  loading = false,
}: {
  climate: HomeClimate[];
  /** No thermostat has answered yet: placeholder tiles under the real header. */
  loading?: boolean;
}) {
  const onIds = climate.filter(isClimateOn).map((unit) => unit.entity_id);
  const range = climateTempRange(climate);

  return (
    <Board
      collapsible
      storageKey="climate"
      title={
        // Wraps the range under the title when the card is too narrow for
        // both, like the Calendar card's count.
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={<IoThermometerOutline />}>Climate</SectionTitle>
          {loading ? (
            <Skeleton height="4" width="3rem" ms="auto" flexShrink="1" minW="0" />
          ) : (
            range && (
              <Text textStyle="sm" color="fg.muted" ms="auto">
                {range}
              </Text>
            )
          )}
        </Flex>
      }
      action={
        onIds.length > 0 ? <ClimateAllOffButton entityIds={onIds} /> : null
      }
    >
      {loading ? <ClimateSkeleton /> : <ClimateTiles climate={climate} />}
    </Board>
  );
}
