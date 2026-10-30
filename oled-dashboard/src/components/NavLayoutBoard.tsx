import { useMemo } from "react";
import { Button, Stack, Text } from "@chakra-ui/react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Board } from "./Board";
import { NavLayoutRow } from "./NavLayoutRow";
import { SectionTitle } from "./SectionTitle/SectionTitle";
import { SortableNavLayoutRow } from "./SortableNavLayoutRow";
import { useLiveGame } from "../hooks/useLiveGame";
import { useDeviceMode } from "../lib/deviceMode";
import {
  HOME_PATH,
  NAV_BAR_ENTRIES,
  NAV_ITEM_BY_PATH,
  SETTINGS_PATH,
  splitForBar,
} from "../lib/navItems";
import {
  defaultNavLayout,
  resetNavLayout,
  sameNavLayout,
  saveNavLayout,
  shownNavItems,
  useNavLayout,
} from "../lib/navLayout";
import { IoCompassOutline } from "react-icons/io5";

// The rows only move up and down.
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const NOTES: Record<string, string> = {
  [HOME_PATH]: "Always first",
  [SETTINGS_PATH]: "Always shown",
  "/football": "Game days only",
};

/**
 * /control's Navigation card: this device's nav entries in their order, each
 * with a switch to show or hide it; drag a row's handle to move it (dnd-kit
 * sortable, the lighter cousin of /home's arranging). Home stays first and on,
 * and Settings stays on, so the nav can always come back here. The entries the
 * bottom bar puts under More are badged. Saved per device (lib/navLayout);
 * Reset, shown once it differs from the default, goes back to it.
 */
export function NavLayoutBoard() {
  const mode = useDeviceMode();
  const layout = useNavLayout();
  const { games } = useLiveGame();
  const gameDay = games.length > 0;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [home, ...rest] = layout;
  const slots = NAV_BAR_ENTRIES[mode];
  const inMore = useMemo(
    () =>
      new Set(
        splitForBar(shownNavItems(layout, gameDay), slots).more.map(
          (i) => i.path,
        ),
      ),
    [layout, gameDay, slots],
  );
  const customized = !sameNavLayout(layout, defaultNavLayout(mode));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = rest.findIndex((e) => e.path === active.id);
    const to = rest.findIndex((e) => e.path === over.id);
    if (from < 0 || to < 0) return;
    saveNavLayout(mode, [home, ...arrayMove(rest, from, to)]);
  }

  function setShown(path: string, shown: boolean) {
    saveNavLayout(
      mode,
      layout.map((e) => (e.path === path ? { ...e, shown } : e)),
    );
  }

  return (
    <Board
      title={<SectionTitle icon={<IoCompassOutline />}>Navigation</SectionTitle>}
      action={
        customized && (
          <Button
            size="xs"
            variant="outline"
            // Taller than the title row; don't let it grow the header.
            my="-1"
            onClick={() => resetNavLayout(mode)}
          >
            Reset
          </Button>
        )
      }
    >
      <Stack gap="1.5">
        <NavLayoutRow
          item={NAV_ITEM_BY_PATH.get(home.path)!}
          shown
          locked
          note={NOTES[home.path]}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[verticalOnly]}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rest.map((e) => e.path)}
            strategy={verticalListSortingStrategy}
          >
            {rest.map((e) => (
              <SortableNavLayoutRow
                key={e.path}
                item={NAV_ITEM_BY_PATH.get(e.path)!}
                shown={e.shown}
                locked={e.path === SETTINGS_PATH}
                note={NOTES[e.path]}
                inMore={inMore.has(e.path)}
                onShownChange={(shown) => setShown(e.path, shown)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Stack>
      <Text textStyle="sm" color="fg.muted" mt="4">
        For this device. Drag to reorder. With more than {slots} shown, the
        bottom bar keeps the first {slots - 1} and puts the rest under More.
      </Text>
    </Board>
  );
}
