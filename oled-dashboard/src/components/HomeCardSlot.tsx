import { useSortable } from "@dnd-kit/sortable";
import { HomeCardFace } from "./HomeCardFace";
import { HomeCardHideButton } from "./HomeCardHideButton";
import { HomeCardWidthPicker } from "./HomeCardWidthPicker";
import type { HomeCardId, HomeGrid } from "../lib/homeLayout";

/**
 * One card's place on /home: a grid item spanning `span` columns. Outside
 * arranging it is an inert wrapper — the card underneath behaves exactly as it
 * did before cards could move. While arranging the whole card is the drag
 * handle, with the hide / show eye at its corner, and on a grid of more than
 * one column it carries a width picker. A hidden card is only ever here while
 * arranging (HomeBoard leaves it out otherwise), as its stand-in.
 *
 * Its place — the column it starts at and the rows it spans — is set by
 * HomeBoard (usePackedGrid), which measures the card and reads its width from
 * `data-span`; this slot sets only how many columns it spans.
 */
export function HomeCardSlot({
  id,
  editing,
  span,
  grid,
  resizable,
  hidden,
  onSpanChange,
  onHiddenChange,
  children,
}: {
  id: HomeCardId;
  editing: boolean;
  /** Columns this card spans on the current grid. */
  span: number;
  grid: HomeGrid;
  /** Offer the width picker (not on a one-column phone). */
  resizable: boolean;
  /** Taken off the page by its user; shown as a stand-in while arranging. */
  hidden: boolean;
  onSpanChange: (span: number) => void;
  onHiddenChange: (hidden: boolean) => void;
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
      data-hidden={hidden || undefined}
      data-span={span}
      style={{ gridColumnEnd: `span ${span}` }}
      {...(editing ? { ...attributes, ...listeners } : {})}
    >
      <HomeCardFace id={id} editing={editing} hidden={hidden}>
        {children}
      </HomeCardFace>
      {editing && (
        <HomeCardHideButton id={id} hidden={hidden} onChange={onHiddenChange} />
      )}
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
