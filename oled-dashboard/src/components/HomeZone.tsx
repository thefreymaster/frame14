import { Box, EmptyState, Text } from "@chakra-ui/react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { HomeCardSlot } from "./HomeCardSlot";
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
    <SortableContext
      id={id}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <Box
        ref={setNodeRef}
        className="home-zone"
        data-zone={id}
        data-editing={editing || undefined}
        data-targeted={targeted || undefined}
        display="flex"
        flexDirection="column"
        gap="4"
        flex={flex}
        minW="0"
        {...(editing && {
          minH: "8rem",
          rounded: "l3",
          outlineWidth: "2px",
          outlineStyle: targeted ? "solid" : "dashed",
          outlineColor: targeted ? "colorPalette.solid" : "border.emphasized",
          outlineOffset: "0.5rem",
        })}
      >
        {editing && (
          <Text textStyle="sm" fontWeight="medium" color="fg.muted">
            {label}
          </Text>
        )}
        {items.map((cardId) => (
          <HomeCardSlot key={cardId} id={cardId} editing={editing}>
            {cards[cardId]}
          </HomeCardSlot>
        ))}
        {editing && items.length === 0 && (
          <EmptyState.Root
            flex="1"
            borderWidth="2px"
            borderStyle="dashed"
            rounded="sm"
            size="sm"
          >
            <EmptyState.Content>
              <EmptyState.Title>Drag a card here</EmptyState.Title>
            </EmptyState.Content>
          </EmptyState.Root>
        )}
      </Box>
    </SortableContext>
  );
}
