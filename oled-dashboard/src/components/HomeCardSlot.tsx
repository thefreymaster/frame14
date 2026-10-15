import { useSortable } from "@dnd-kit/sortable";
import { HomeCardFace } from "./HomeCardFace";
import { HomeCardWidthPicker } from "./HomeCardWidthPicker";
import type { HomeCardId, HomeGrid } from "../lib/homeLayout";

/**
 * One card's place on /home: a grid item spanning `span` columns. Outside
 * arranging it is an inert wrapper — the card underneath behaves exactly as it
 * did before cards could move. While arranging the whole card is the drag
 * handle, and on a grid of more than one column it carries a width picker.
 *
 * Its height in rows is set by HomeBoard (`grid-row-end`), which measures the
 * card; see "Packing" there.
 */
export function HomeCardSlot({
  id,
  editing,
  span,
  grid,
  resizable,
  onSpanChange,
  children,
}: {
  id: HomeCardId;
  editing: boolean;
  /** Columns this card spans on the current grid. */
  span: number;
  grid: HomeGrid;
  /** Offer the width picker (not on a one-column phone). */
  resizable: boolean;
  onSpanChange: (span: number) => void;
  children: React.ReactNode;
}) {
  // No transform: the board reorders the real list while a card is in the air
  // (sortable's translate assumes a list it can predict, and a packed grid of
  // mixed widths isn't one), so this slot only marks the gap the card left.
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id,
    disabled: !editing,
  });

  return (
    <div
      ref={setNodeRef}
      className="home-card"
      data-card={id}
      data-editing={editing || undefined}
      data-dragging={isDragging || undefined}
      style={{ gridColumn: `span ${span}` }}
      {...(editing ? { ...attributes, ...listeners } : {})}
    >
      <HomeCardFace id={id} editing={editing}>
        {children}
      </HomeCardFace>
      {editing && resizable && (
        <HomeCardWidthPicker
          id={id}
          grid={grid}
          span={span}
          onChange={onSpanChange}
        />
      )}
    </div>
  );
}
