import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HomeCardFace } from "./HomeCardFace";
import type { HomeCardId } from "../lib/homeLayout";

/**
 * One card's place on /home. Outside arranging it is an inert wrapper — the
 * card underneath behaves exactly as it did before cards could move.
 */
export function HomeCardSlot({
  id,
  editing,
  children,
}: {
  id: HomeCardId;
  editing: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
      // Translate, not Transform: cards differ in height, and sortable's scale
      // would squash one card into the shape of the one it is passing.
      style={editing ? { transform: CSS.Translate.toString(transform), transition } : undefined}
      {...(editing ? { ...attributes, ...listeners } : {})}
    >
      <HomeCardFace id={id} editing={editing}>
        {children}
      </HomeCardFace>
    </div>
  );
}
