import { IconButton } from "@chakra-ui/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LuGripVertical } from "react-icons/lu";
import { NavLayoutRow, type NavLayoutRowProps } from "./NavLayoutRow";

/**
 * A NavLayoutRow that drags by its handle (dnd-kit sortable; see
 * NavLayoutBoard). Only the handle starts a drag, and it opts out of touch
 * scrolling, so the rest of the row still scrolls the page and the switch
 * still taps.
 */
export function SortableNavLayoutRow(
  props: Omit<NavLayoutRowProps, "handle" | "dragging" | "ref" | "style">,
) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.path });

  return (
    <NavLayoutRow
      {...props}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={
        <IconButton
          ref={setActivatorNodeRef}
          aria-label={`Move ${props.item.label}`}
          variant="ghost"
          size="sm"
          color="fg.muted"
          cursor={isDragging ? "grabbing" : "grab"}
          touchAction="none"
          {...attributes}
          {...listeners}
        >
          <LuGripVertical />
        </IconButton>
      }
    />
  );
}
