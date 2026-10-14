import { Box, Text } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { HomeCardSlot } from "./HomeCardSlot";
import { GRID_GAP } from "../lib/surfaces";
import type { HomeCardId, HomeZoneId } from "../lib/homeLayout";

/**
 * A column or full-width band of cards. The zone is a drop target of its own,
 * so a card can land in it even when it is empty.
 */
export function HomeZone({
  id,
  label,
  items,
  cards,
  editing,
  targeted,
  flex,
}: {
  id: HomeZoneId;
  label: string;
  items: HomeCardId[];
  cards: Record<HomeCardId, React.ReactNode>;
  editing: boolean;
  targeted: boolean;
  flex?: string;
}) {
  const { setNodeRef } = useDroppable({ id, disabled: !editing });

  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <Box
        ref={setNodeRef}
        className="home-zone"
        data-zone={id}
        data-editing={editing || undefined}
        data-targeted={targeted || undefined}
        display="flex"
        flexDirection="column"
        gap={GRID_GAP}
        flex={flex}
        minW="0"
      >
        {editing && (
          <Text
            fontSize="clamp(11px, 1.6vmin, 22px)"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="var(--theme-fg-faint)"
          >
            {label}
          </Text>
        )}
        {items.map((cardId) => (
          <HomeCardSlot key={cardId} id={cardId} editing={editing}>
            {cards[cardId]}
          </HomeCardSlot>
        ))}
        {editing && items.length === 0 && (
          <div className="home-zone-empty">
            <Text fontSize="clamp(13px, 2vmin, 26px)" color="var(--theme-fg-faint)">
              Drag a card here
            </Text>
          </div>
        )}
      </Box>
    </SortableContext>
  );
}
