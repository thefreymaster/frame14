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
        gap="gutter"
        flex={flex}
        minW="0"
        {...(editing && {
          minH: "12vmin",
          borderRadius: "1vmin",
          outline: targeted
            ? "0.3vmin solid {colors.fg.dim}"
            : "0.2vmin dashed {colors.divider}",
          outlineOffset: "0.6vmin",
        })}
      >
        {editing && (
          <Text
            fontSize="clamp(11px, 1.6vmin, 22px)"
            letterSpacing="0.12em"
            textTransform="uppercase"
            color="fg.faint"
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
          <EmptyState.Root
            flex="1"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="10vmin"
            p="0"
            borderRadius="card"
            borderWidth="0.2vmin"
            borderStyle="dashed"
            borderColor="fg.faint"
          >
            <EmptyState.Content>
              <EmptyState.Title
                fontSize="clamp(13px, 2vmin, 26px)"
                fontWeight="400"
                color="fg.faint"
              >
                Drag a card here
              </EmptyState.Title>
            </EmptyState.Content>
          </EmptyState.Root>
        )}
      </Box>
    </SortableContext>
  );
}
