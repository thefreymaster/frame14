import { Flex, Grid, Skeleton, Text } from "@chakra-ui/react";
import { useEntities } from "../hooks/useEntity";
import {
  guestStatus,
  type GuestAttrs,
  type GuestKind,
  type UnraidContainer,
  type UnraidVm,
} from "../lib/unraid";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { UnraidGuestTile } from "./UnraidGuestTile";

/** As many 16rem tiles as the card holds: one on a phone, three on the frame. */
const TILE_COLUMNS = "repeat(auto-fill, minmax(16rem, 1fr))";

/**
 * A server's Docker containers, or its VMs (0.151.0): a tile each, in name
 * order, with how many are running beside the title, in grey like the
 * Climate card's range. Read-only: nothing here starts or stops them.
 */
export function UnraidGuestsCard({
  kind,
  guests,
  title,
  icon,
}: {
  kind: GuestKind;
  guests: (UnraidContainer | UnraidVm)[];
  title: string;
  icon: React.ReactNode;
}) {
  const states = useEntities<GuestAttrs>(guests.map((g) => g.switch));
  const loaded = states.every((q) => q.data);
  const running = states.filter((q) => guestStatus(kind, q.data).running).length;

  return (
    <Board
      title={
        <Flex align="center" gap="3" rowGap="1" wrap="wrap" width="100%">
          <SectionTitle icon={icon}>{title}</SectionTitle>
          {loaded ? (
            <Text textStyle="sm" color="fg.muted" ms="auto">
              {running} of {guests.length} running
            </Text>
          ) : (
            <Skeleton height="4" width="6rem" ms="auto" flexShrink="1" minW="0" />
          )}
        </Flex>
      }
    >
      <Grid templateColumns={TILE_COLUMNS} gap="3">
        {guests.map((g) => (
          <UnraidGuestTile key={g.switch} kind={kind} guest={g} />
        ))}
      </Grid>
    </Board>
  );
}
