import { useEffect, useRef, useState } from "react";
import { Grid, Stack } from "@chakra-ui/react";
import { LuMonitor } from "react-icons/lu";
import { TbBrandDocker } from "react-icons/tb";
import { useDesktop } from "../hooks/useDesktop";
import type { UnraidServer } from "../lib/unraid";
import { HEADER_CLEARANCE, PAGE_GUTTER } from "../lib/navMetrics";
import { UnraidGuestsCard } from "./UnraidGuestsCard";
import { UnraidServerCard } from "./UnraidServerCard";

/**
 * The VM tiles in a desktop's left column: two across where the cards' 16rem
 * would stack them, so the column — the server's card over them — keeps to
 * a 1080p screen.
 */
const SIDE_TILE_COLUMNS = "repeat(auto-fill, minmax(12rem, 1fr))";

/**
 * Where the desktop's left column sticks: a gutter under the header. A
 * sticky box's offsets count from inside its scroller's padding, and
 * Layout's scroll box is padded by HEADER_CLEARANCE, so the gutter alone.
 */
const STICKY_TOP = PAGE_GUTTER;

/** The scroll box's height below its header padding, where the column sticks. */
const STICKY_ROOM = `calc(var(--app-height, 100dvh) - ${HEADER_CLEARANCE})`;

/**
 * The left column's `top`: STICKY_TOP while the column fits the screen; a
 * taller one sticks by its bottom instead, a gutter above the screen's,
 * once the page has scrolled that far — stuck by its top, its end would
 * stay under the fold until the page's end.
 */
function useStickyTop(
  ref: React.RefObject<HTMLDivElement | null>,
  /** The column is on the page (a window resized into two columns too). */
  shown: boolean,
) {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!shown || !el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, shown]);
  return height == null
    ? STICKY_TOP
    : `min(${STICKY_TOP}, calc(${STICKY_ROOM} - ${height}px - ${PAGE_GUTTER}))`;
}

/**
 * One Unraid server's cards (0.152.0): its health (UnraidServerCard), its VMs
 * and its containers (UnraidGuestsCard, each collapsible). The VMs come
 * before the containers, a few tiles before dozens. On a desktop the server
 * and its VMs are a column at the left, stuck in view while the page
 * scrolls, beside the containers (the user: "The unraid page feels a bit
 * wide on desktop"): across the whole width the meters and figures were
 * spread thin and two VM tiles had a band of their own under 47 containers.
 */
export function UnraidServerSection({
  server,
  named,
}: {
  server: UnraidServer;
  /** Name the cards for the server: there is more than one. */
  named: boolean;
}) {
  const desktop = useDesktop();
  // The two columns: a desktop's, beside containers to fill the other.
  const columns = desktop && server.containers.length > 0;
  const sideRef = useRef<HTMLDivElement>(null);
  const stickyTop = useStickyTop(sideRef, columns);
  const whose = (what: string) => (named ? `${server.name} ${what}` : what);
  const vms = server.vms ?? [];

  const serverCard = <UnraidServerCard server={server} />;
  const vmsCard = vms.length > 0 && (
    <UnraidGuestsCard
      kind="vm"
      guests={vms}
      title={whose("VMs")}
      icon={<LuMonitor />}
      storageKey={`unraid-${server.id}-vms`}
      columns={columns ? SIDE_TILE_COLUMNS : undefined}
    />
  );
  const containersCard = server.containers.length > 0 && (
    <UnraidGuestsCard
      kind="container"
      guests={server.containers}
      title={whose("Containers")}
      icon={<TbBrandDocker />}
      storageKey={`unraid-${server.id}-containers`}
    />
  );

  if (!columns) {
    return (
      <>
        {serverCard}
        {vmsCard}
        {containersCard}
      </>
    );
  }
  return (
    <Grid
      templateColumns="minmax(0, 1fr) minmax(0, 2fr)"
      gap="gutter"
      alignItems="start"
      data-unraid-server={server.name}
    >
      <Stack
        ref={sideRef}
        gap="gutter"
        position="sticky"
        top={stickyTop}
        data-unraid-side=""
      >
        {serverCard}
        {vmsCard}
      </Stack>
      {containersCard}
    </Grid>
  );
}
