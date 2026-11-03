import { useState } from "react";
import { Badge, Box, Center, Flex, Spacer, Text } from "@chakra-ui/react";
import type { VacuumModel } from "../hooks/useVacuum";
import { fmtWhen } from "../lib/format";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { SegmentedControl } from "./ui/segmented-control";
import { IoMapOutline } from "react-icons/io5";

/**
 * The vacuum's map, as its integration draws it (an image entity), in a
 * 4:3 well with the whole map shown. The image entity's state is when the map
 * last changed; it rides on the URL, so a new map loads as soon as HA has it.
 * Live while the vacuum is out; a vacuum with several maps (floors) gets a
 * picker.
 */
export function VacuumMapCard({
  vacuum,
  title = "Map",
}: {
  vacuum: VacuumModel;
  /** "Map" on /vacuum, where the page names the vacuum; its name on /cameras. */
  title?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const map = vacuum.maps.find((m) => m.entity_id === picked) ?? vacuum.maps[0];
  if (!map) return null;
  const live = vacuum.state === "cleaning" || vacuum.state === "returning";
  const updated = map.version ? new Date(map.version) : null;

  return (
    <Board
      title={
        <Flex align="center" gap="3" width="100%">
          <SectionTitle icon={<IoMapOutline />}>{title}</SectionTitle>
          <Spacer />
          {live && <Badge colorPalette="green">Live</Badge>}
        </Flex>
      }
    >
      {vacuum.maps.length > 1 && (
        <SegmentedControl
          size="sm"
          mb="4"
          items={vacuum.maps.map((m) => ({
            value: m.entity_id,
            label: m.name,
          }))}
          value={map.entity_id}
          aria-label="Map"
          onValueChange={(e) => setPicked(e.value)}
        />
      )}
      <Box
        position="relative"
        aspectRatio="4 / 3"
        rounded="sm"
        overflow="hidden"
        bg="bg.muted"
      >
        {map.version ? (
          <img
            src={`/api/home/vacuum/map/${encodeURIComponent(map.entity_id)}?v=${encodeURIComponent(map.version)}`}
            alt={`${map.name} map`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <Center position="absolute" inset="0">
            <Text color="fg.muted">No map yet</Text>
          </Center>
        )}
      </Box>
      <Text textStyle="sm" color="fg.muted" mt="2">
        {map.name}
        {updated && !isNaN(updated.getTime())
          ? ` · updated ${fmtWhen(updated)}`
          : ""}
      </Text>
    </Board>
  );
}
