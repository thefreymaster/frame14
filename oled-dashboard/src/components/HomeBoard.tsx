import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Grid } from "@chakra-ui/react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { HomeZone } from "./HomeZone";
import { HomeCardFace } from "./HomeCardFace";
import { HomeLayoutToolbar } from "./HomeLayoutToolbar";
import { toaster } from "./ui/toaster";
import { useLongPress } from "../hooks/useLongPress";
import {
  clearHomeLayout,
  defaultHomeLayout,
  HOME_ZONE_LABELS,
  HOME_ZONES,
  loadHomeLayout,
  saveHomeLayout,
  type HomeCardId,
  type HomeLayout,
  type HomeOrientation,
  type HomeZoneId,
} from "../lib/homeLayout";

// A wall panel left mid-arrange would sit there with dashed outlines until
// someone noticed. Quietly finish instead.
const EDIT_IDLE_MS = 90_000;

/**
 * The /home cards, rearrangeable. Press and hold any card to start arranging;
 * cards then drag between columns and full-width bands, and the result is
 * saved for this device and orientation (lib/homeLayout.ts).
 *
 * The drag logic is dnd-kit's multiple-containers pattern: a card crossing into
 * another zone is moved there while still in the air (onDragOver), so the zone
 * opens a gap for it, and the order within the zone is settled on drop.
 */
export function HomeBoard({
  orientation,
  cards,
}: {
  orientation: HomeOrientation;
  cards: Record<HomeCardId, React.ReactNode>;
}) {
  const zones = HOME_ZONES[orientation];
  const [layout, setLayout] = useState<HomeLayout>(() =>
    loadHomeLayout(orientation),
  );
  const [editing, setEditing] = useState(false);
  const [activeId, setActiveId] = useState<HomeCardId | null>(null);
  const [overZone, setOverZone] = useState<HomeZoneId | null>(null);
  const [activity, setActivity] = useState(0);

  const beforeDrag = useRef<HomeLayout | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedToNewZone = useRef(false);

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

  const isZone = useCallback(
    (id: UniqueIdentifier): id is HomeZoneId =>
      zones.includes(id as HomeZoneId),
    [zones],
  );

  const zoneOf = useCallback(
    (id: UniqueIdentifier): HomeZoneId | undefined =>
      isZone(id)
        ? id
        : zones.find((z) => layout[z]?.includes(id as HomeCardId)),
    [isZone, layout, zones],
  );

  // Pointer first: whatever the finger is over wins. Over a zone but between
  // its cards, take the nearest card in that zone; over an empty zone, the zone.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const pointerHits = pointerWithin(args);
      const hits =
        pointerHits.length > 0 ? pointerHits : rectIntersection(args);
      let overId = getFirstCollision(hits, "id");

      if (overId != null) {
        if (isZone(overId)) {
          const zoneItems = layout[overId] ?? [];
          if (zoneItems.length > 0) {
            overId =
              closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter((c) =>
                  zoneItems.includes(c.id as HomeCardId),
                ),
              })[0]?.id ?? overId;
          }
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      // Moving a card into a new zone reflows the page under the pointer for a
      // frame; hold the last answer rather than flicker back to the old zone.
      if (movedToNewZone.current) lastOverId.current = activeId;
      return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
    },
    [activeId, isZone, layout],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      movedToNewZone.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [layout]);

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
    setActiveId(active.id as HomeCardId);
    setOverZone(zoneOf(active.id) ?? null);
    setActivity((n) => n + 1);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = zoneOf(active.id);
    const to = zoneOf(over.id);
    if (!from || !to) return;
    setOverZone(to);
    if (from === to) return;

    setLayout((prev) => {
      const target = prev[to] ?? [];
      let index = target.length;
      if (!isZone(over.id)) {
        const overIndex = target.indexOf(over.id as HomeCardId);
        const translated = active.rect.current.translated;
        const below =
          translated != null &&
          translated.top > over.rect.top + over.rect.height / 2;
        if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
      }
      movedToNewZone.current = true;
      const id = active.id as HomeCardId;
      return {
        ...prev,
        [from]: (prev[from] ?? []).filter((c) => c !== id),
        [to]: [...target.slice(0, index), id, ...target.slice(index)],
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    let next = layout;
    const zone = zoneOf(active.id);
    if (zone && over && zoneOf(over.id) === zone && !isZone(over.id)) {
      const items = layout[zone] ?? [];
      const from = items.indexOf(active.id as HomeCardId);
      const to = items.indexOf(over.id as HomeCardId);
      if (from !== to) next = { ...layout, [zone]: arrayMove(items, from, to) };
    }
    setLayout(next);
    if (JSON.stringify(next) !== JSON.stringify(beforeDrag.current)) {
      saveHomeLayout(orientation, next);
    }
    endDrag();
  }

  function onDragCancel() {
    if (beforeDrag.current) setLayout(beforeDrag.current);
    endDrag();
  }

  function endDrag() {
    beforeDrag.current = null;
    lastOverId.current = null;
    setActiveId(null);
    setOverZone(null);
    setActivity((n) => n + 1);
  }

  function reset() {
    clearHomeLayout(orientation);
    setLayout(defaultHomeLayout(orientation));
    setActivity((n) => n + 1);
    toaster.create({
      title: "Layout reset",
      description: `Cards are back in their default ${orientation} places.`,
      type: "info",
    });
  }

  const zone = (id: HomeZoneId, props: { flex?: string } = {}) => (
    <HomeZone
      key={id}
      id={id}
      label={HOME_ZONE_LABELS[id]}
      items={layout[id] ?? []}
      cards={cards}
      editing={editing}
      targeted={activeId != null && overZone === id}
      {...props}
    />
  );

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
        width="100%"
        minHeight="100%"
        display="flex"
        flexDirection={orientation === "portrait" ? "column" : "row"}
        alignItems={orientation === "portrait" ? undefined : "flex-start"}
        gap="4"
        p="4"
        // Room to scroll the last card clear of the arranging bar.
        pb={editing ? "12rem" : "4"}
        onPointerDownCapture={
          editing ? () => setActivity((n) => n + 1) : undefined
        }
        {...longPress}
      >
        {orientation === "portrait" ? (
          <>
            {zone("top")}
            {/* Climate takes the wider left cell while the right stacks in a
                narrower rail, so no two tiles share a size and the page stops
                reading as a flat stack. On a phone (below Chakra's md) two
                columns are too narrow to read, so the zones stack instead —
                every card full width, in its saved order. */}
            <Grid
              className="home-columns"
              data-editing={editing || undefined}
              templateColumns={{ base: "minmax(0, 1fr)", md: "1.15fr 1fr" }}
              gap="4"
            >
              {zone("left")}
              {zone("right")}
            </Grid>
            {zone("bottom")}
          </>
        ) : (
          <>
            {zone("left", { flex: "1" })}
            {zone("right", { flex: "1" })}
          </>
        )}
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
              rounded="l3"
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
        onDone={() => setEditing(false)}
        onReset={reset}
      />
    </DndContext>
  );
}
