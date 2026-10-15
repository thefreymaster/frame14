import { useState } from "react";
import { Box, Card, Collapsible } from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";

const STORAGE_PREFIX = "board-collapsed:";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function readOpen(key: string | undefined, fallback: boolean): boolean {
  if (!key) return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v === "1") return false;
    if (v === "0") return true;
  } catch {
    // ignore
  }
  return fallback;
}

function writeOpen(key: string | undefined, open: boolean) {
  if (!key) return;
  try {
    localStorage.setItem(key, open ? "0" : "1");
  } catch {
    // ignore
  }
}

// Chakra's dark-mode shades that equal the raised card's gray.800, one step up
// for everything inside it. See Board.
const DARK_RAISED = {
  "--chakra-colors-bg-emphasized": "colors.gray.700",
  "--chakra-colors-border": "colors.gray.700",
  "--chakra-colors-border-emphasized": "colors.gray.600",
  "--chakra-colors-gray-muted": "colors.gray.700",
  "--chakra-colors-gray-border": "colors.gray.700",
  "--chakra-colors-gray-emphasized": "colors.gray.600",
  "--chakra-colors-color-palette-muted": "colors.gray.700",
  "--chakra-colors-color-palette-border": "colors.gray.700",
  "--chakra-colors-color-palette-emphasized": "colors.gray.600",
};

/**
 * A section card: Chakra's Card, optionally collapsible.
 *
 * A collapsible board is a Collapsible whose trigger is the card header.
 * Collapse state persists per board in localStorage under
 * `board-collapsed:<key>`.
 *
 * Below Chakra's md breakpoint (768px, a phone) the card is size sm, so its
 * padding and header-to-body gap drop from spacing.6 to spacing.4.
 *
 * Every card uses Chakra's `sm` radius rather than the Card's own `l3` (md);
 * tiles inside a card use `sm` too, so none is rounder than its card.
 *
 * In dark mode the card is gray.800 rather than the Card's `bg.panel`
 * (gray.950): on the frame's matte NXTPAPER screen gray.950 sat so close to
 * the page that the cards disappeared. gray.800 is also what Chakra's
 * `bg.emphasized`, `border` and the gray palette's `muted` / `border` are in
 * dark mode, so inside the card those step up one shade (DARK_RAISED) —
 * otherwise skeleton bars, switch tracks, outline buttons and field borders
 * vanish into it. Rows and tiles inside a card stay `bg.muted` / `bg.panel`
 * and read as wells.
 */
export const Board = ({
  children,
  onClick,
  title,
  collapsible = false,
  defaultOpen = true,
  storageKey,
  span,
  fill = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  storageKey?: string;
  /** Span both columns of the home bento grid. Ignored outside a grid. */
  span?: 1 | 2;
  /**
   * Take the remaining height of a flex-column page and let the content scroll
   * or size inside it — used by the pages built around a chart or a long list.
   */
  fill?: boolean;
}) => {
  const persistKey = collapsible
    ? storageKey || (typeof title === "string" ? slugify(title) : undefined)
    : undefined;
  const fullKey = persistKey ? `${STORAGE_PREFIX}${persistKey}` : undefined;
  const [open, setOpen] = useState(() => readOpen(fullKey, defaultOpen));

  const titleNode =
    typeof title === "string" ? <Card.Title>{title}</Card.Title> : title;

  const hasBody = children != null && children !== false;
  const body = hasBody ? (
    <Card.Body flex={fill ? "1" : undefined} minH={fill ? "0" : undefined}>
      {children}
    </Card.Body>
  ) : null;

  return (
    <Card.Root
      size={{ base: "sm", md: "md" }}
      bg={{ _dark: "gray.800" }}
      borderColor={{ _dark: "gray.800" }}
      css={{ _dark: DARK_RAISED }}
      borderRadius="sm"
      minW="0"
      flex={fill ? "1" : undefined}
      minH={fill ? "0" : undefined}
      gridColumn={span === 2 ? "1 / -1" : undefined}
      onClick={!collapsible ? onClick : undefined}
      cursor={onClick && !collapsible ? "pointer" : undefined}
    >
      {collapsible ? (
        <Collapsible.Root
          open={open}
          onOpenChange={(e) => {
            setOpen(e.open);
            writeOpen(fullKey, e.open);
          }}
        >
          <Collapsible.Trigger asChild>
            <Card.Header
              as="button"
              width="100%"
              flexDirection="row"
              alignItems="center"
              textAlign="start"
              cursor="pointer"
              // Collapsed, the header is the whole card.
              _closed={{ pb: "var(--card-padding)" }}
            >
              <Box flex="1" minW="0">
                {titleNode}
              </Box>
              <Collapsible.Indicator
                color="fg.muted"
                transition="transform 0.2s"
                _closed={{ transform: "rotate(-90deg)" }}
              >
                <LuChevronDown />
              </Collapsible.Indicator>
            </Card.Header>
          </Collapsible.Trigger>
          <Collapsible.Content>{body}</Collapsible.Content>
        </Collapsible.Root>
      ) : (
        <>
          {title != null && (
            <Card.Header
              flexDirection="row"
              alignItems="center"
              // A title-only card (a page header) is all header.
              pb={hasBody ? undefined : "var(--card-padding)"}
            >
              <Box flex="1" minW="0">
                {titleNode}
              </Box>
            </Card.Header>
          )}
          {body}
        </>
      )}
    </Card.Root>
  );
};
