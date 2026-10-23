import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Grid } from "@chakra-ui/react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { HomeCardSlot } from "./HomeCardSlot";
import { HomeCardFace } from "./HomeCardFace";
import { HomeLayoutToolbar } from "./HomeLayoutToolbar";
import { toaster } from "./ui/toaster";
import { useLongPress } from "../hooks/useLongPress";
import { PACKED_ROW_PX, usePackedRows } from "../hooks/usePackedRows";
import {
  clearHomeLayout,
  defaultHomeLayout,
  homeGridFor,
  loadHomeLayout,
  saveHomeLayout,
  type HomeCardId,
  type HomeColumns,
  type HomeLayout,
} from "../lib/homeLayout";

// A wall panel left mid-arrange would sit there with dashed outlines until
// someone noticed. Quietly finish instead.
const EDIT_IDLE_MS = 90_000;

// After a card trades places mid-drag, the grid re-packs under the finger and
// can put the card it just passed back beneath it. Wait for this much travel
// before trading again, or the two flip back and forth.
const SWAP_TRAVEL_PX = 32;

// The board never animates a card into place, so sortable has nothing to do.
const noTransforms = () => null;

/**
 * The /home cards, rearrangeable. Press and hold any card to start arranging;
 * cards then drag to a new place and, on a grid of more than one column, take
 * a width from the picker under each card. The result is saved for this
 * device and grid (lib/homeLayout.ts).
 *
 * The page is one grid of `columns` equal columns. Cards differ in height, and
 * a plain grid would make every card in a row as tall as the tallest, leaving
 * gaps under the short ones, so the grid is packed (hooks/usePackedRows): cards
 * stack under each other column by column, as the old fixed columns did,
 * while any card can span any number of them.
 *
 * Dragging reorders the real list while the card is in the air (onDragOver),
 * so the grid packs around it and shows exactly where it will land.
 */
export function HomeBoard({
  columns,
  cards,
}: {
  columns: HomeColumns;
  cards: Record<HomeCardId, React.ReactNode>;
}) {
  const grid = homeGridFor(columns);
  const [layout, setLayout] = useState<HomeLayout>(() => loadHomeLayout(grid));
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<HomeCardId | null>(null);
  const [activity, setActivity] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  const beforeDrag = useRef<HomeLayout | null>(null);
  const lastSwapAt = useRef<{ x: number; y: number } | null>(null);

  const longPress = useLongPress(
    () => {
      navigator.vibrate?.(15);
      setEditing(true);
    },
    { enabled: !editing },
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // A short hold before a touch drag, so a quick swipe still scrolls the page.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Whatever the finger is over wins; between cards, the nearest one.
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : closestCenter(args);
  }, []);

  const order = layout.map((card) => card.id);
  const orderKey = order.join();

  usePackedRows(gridRef, [orderKey, columns, editing]);

  useEffect(() => {
    if (!editing) return;
    const timer = setTimeout(() => setEditing(false), EDIT_IDLE_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !activeId) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [editing, activity, activeId]);

  function onDragStart({ active }: DragStartEvent) {
    beforeDrag.current = layout;
    lastSwapAt.current = null;
    setActiveId(active.id as HomeCardId);
    setActivity((n) => n + 1);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || over.id === active.id) return;
    const rect = active.rect.current.translated;
    const at = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : null;
    const last = lastSwapAt.current;
    if (
      last &&
      at &&
      Math.hypot(at.x - last.x, at.y - last.y) < SWAP_TRAVEL_PX
    ) {
      return;
    }
    lastSwapAt.current = at;
    setLayout((prev) => {
      const from = prev.findIndex((card) => card.id === active.id);
      const to = prev.findIndex((card) => card.id === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  }

  function onDragEnd() {
    if (JSON.stringify(layout) !== JSON.stringify(beforeDrag.current)) {
      saveHomeLayout(grid, layout);
    }
    endDrag();
  }

  function onDragCancel() {
    if (beforeDrag.current) setLayout(beforeDrag.current);
    endDrag();
  }

  function endDrag() {
    beforeDrag.current = null;
    lastSwapAt.current = null;
    setActiveId(null);
    setActivity((n) => n + 1);
  }

  function setSpan(id: HomeCardId, span: number) {
    const next = layout.map((card) =>
      card.id === id ? { ...card, span } : card,
    );
    setLayout(next);
    saveHomeLayout(grid, next);
    setActivity((n) => n + 1);
  }

  function reset() {
    clearHomeLayout(grid);
    setLayout(defaultHomeLayout(grid));
    setActivity((n) => n + 1);
    toaster.create({
      title: "Layout reset",
      description: "Cards are back in their default places and widths.",
      type: "info",
    });
  }

  // A phone shows the two-column order, every card full width.
  const spanOf = (span: number) => Math.min(span, columns);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <Box
        className="home-board"
        data-editing={editing || undefined}
        position="relative"
        width="100%"
        minHeight="100%"
        p="xs"
        // Room to scroll the last card (and its width picker) clear of the
        // arranging bar.
        pb={editing ? "12rem" : "4"}
        onPointerDownCapture={
          editing ? () => setActivity((n) => n + 1) : undefined
        }
        {...longPress}
      >
        {/* While arranging, the columns themselves show as dashed lanes, so
            a width reads as "this many of these". */}
        {editing && columns > 1 && (
          <Grid
            aria-hidden
            position="absolute"
            inset="xs"
            templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
            columnGap="xs"
            pointerEvents="none"
          >
            {Array.from({ length: columns }, (_, i) => (
              <Box
                key={i}
                // The cards' radius (the theme's surface, on the Card recipe).
                rounded="surface"
                borderWidth="2px"
                borderStyle="dashed"
                borderColor="border.emphasized"
              />
            ))}
          </Grid>
        )}

        <SortableContext items={order} strategy={noTransforms}>
          <Grid
            ref={gridRef}
            className="home-grid"
            position="relative"
            templateColumns={`repeat(${columns}, minmax(0, 1fr))`}
            autoRows={`${PACKED_ROW_PX}px`}
            autoFlow="row dense"
            columnGap="xs"
            rowGap="0"
            alignItems="start"
          >
            {layout.map((card) => (
              <HomeCardSlot
                key={card.id}
                id={card.id}
                editing={editing}
                span={spanOf(card.span)}
                grid={grid}
                resizable={columns > 1}
                onSpanChange={(span) => setSpan(card.id, span)}
              >
                {cards[card.id]}
              </HomeCardSlot>
            ))}
          </Grid>
        </SortableContext>
      </Box>

      {/* Portalled for the same reason as the toolbar: a fixed overlay under
          PageTransition's transform would be offset from the finger. */}
      {createPortal(
        <DragOverlay>
          {activeId && (
            <Box
              className="home-card home-card-lifted"
              data-editing
              shadow="lg"
              rounded="surface"
            >
              <HomeCardFace id={activeId} editing>
                {cards[activeId]}
              </HomeCardFace>
            </Box>
          )}
        </DragOverlay>,
        document.body,
      )}

      <HomeLayoutToolbar
        open={editing}
        resizable={columns > 1}
        onDone={() => setEditing(false)}
        onReset={reset}
      />
    </DndContext>
  );
}
