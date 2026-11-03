import { useState } from "react";
import { Box, Card, chakra, Collapsible } from "@chakra-ui/react";
import { LuChevronDown } from "react-icons/lu";
import { DARK_RAISED, SURFACE_SHADOW } from "../lib/floatingSurface";

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

/**
 * A section card: Chakra's Card, optionally collapsible.
 *
 * A collapsible board is a Collapsible whose trigger is the card header.
 * Collapse state persists per board in localStorage under
 * `board-collapsed:<key>`.
 *
 * A card that isn't collapsible can be one big button instead (`onClick`,
 * named for screen readers by `label`): the whole card is the tap target, and
 * Enter or Space presses it from the keyboard.
 *
 * An `action` sits at the right of the header, before the chevron. It can't
 * live inside the trigger (a button in a button), so the trigger wraps only
 * the title and stretches an ::after over the whole header; the action is
 * raised above that, and a tap anywhere else in the header still toggles.
 *
 * Below Chakra's md breakpoint (768px, a phone) the card is size sm, and its
 * padding and header-to-body gap drop further, from sm's spacing.4 to
 * spacing.3, to give a phone's narrow column more room (spacing.6 above md).
 *
 * Every card has the theme's `surface` corners (set on the Card recipe, and
 * shared with the floating side rail); tiles inside a card use the smaller
 * `sm`, so none is rounder than its card.
 *
 * Its 1px edge is the theme's `border.surface` (gray.700 in dark mode), the
 * same as the floating navs'.
 *
 * Its colour is the theme's `bg.surface`: #1C1C1E in dark mode (iOS's
 * grouped-cell grey, since 0.71; #23242b before) rather than the Card's
 * `bg.panel` (gray.950), which on the frame's matte NXTPAPER screen sat so
 * close to the page that the cards disappeared. That's a hair under gray.800,
 * which is what Chakra's `bg.emphasized`, `border` and the gray palette's
 * `muted` / `border` are in dark mode, so inside the card those step up one
 * shade (DARK_RAISED) —
 * otherwise skeleton bars, switch tracks, outline buttons and field borders
 * vanish into it. Rows and tiles inside a card stay `bg.muted` / `bg.panel`
 * and read as wells.
 */
export const Board = ({
  children,
  onClick,
  label,
  title,
  action,
  collapsible = false,
  defaultOpen = true,
  storageKey,
  span,
  fill = false,
  bg,
}: {
  children: React.ReactNode;
  /** Makes a non-collapsible card a button. */
  onClick?: () => void;
  /** What pressing the card does, e.g. "Open the weather page". */
  label?: string;
  title?: React.ReactNode;
  /** A control at the right of the header, e.g. a button. */
  action?: React.ReactNode;
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
  /**
   * The card's colour in place of `bg.surface`, e.g. the page's own `bg` for
   * the framed clock. DARK_RAISED is for `bg.surface`, so it's dropped.
   */
  bg?: string;
}) => {
  const persistKey = collapsible
    ? storageKey || (typeof title === "string" ? slugify(title) : undefined)
    : undefined;
  const fullKey = persistKey ? `${STORAGE_PREFIX}${persistKey}` : undefined;
  const [open, setOpen] = useState(() => readOpen(fullKey, defaultOpen));

  const titleNode =
    typeof title === "string" ? <Card.Title>{title}</Card.Title> : title;

  const actionNode =
    action != null && action !== false ? (
      <Box position="relative" zIndex="1" flexShrink={0}>
        {action}
      </Box>
    ) : null;

  const clickable = onClick != null && !collapsible;

  const hasBody = children != null && children !== false;
  const body = hasBody ? (
    <Card.Body flex={fill ? "1" : undefined} minH={fill ? "0" : undefined}>
      {children}
    </Card.Body>
  ) : null;

  return (
    <Card.Root
      size={{ base: "sm", md: "md" }}
      bg={bg ?? "bg.surface"}
      borderColor="border.surface"
      // The navs' shadow (0.126): a card casts the same shade as the rail.
      shadow={SURFACE_SHADOW}
      css={{
        _dark: bg ? undefined : DARK_RAISED,
        "--card-padding": { mdDown: "spacing.3" },
      }}
      minW="0"
      flex={fill ? "1" : undefined}
      minH={fill ? "0" : undefined}
      gridColumn={span === 2 ? "1 / -1" : undefined}
      onClick={clickable ? onClick : undefined}
      cursor={clickable ? "pointer" : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? label : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      _focusVisible={
        clickable
          ? {
              outline: "2px solid",
              outlineColor: "colorPalette.focusRing",
              outlineOffset: "2px",
            }
          : undefined
      }
    >
      {collapsible ? (
        <Collapsible.Root
          open={open}
          onOpenChange={(e) => {
            setOpen(e.open);
            writeOpen(fullKey, e.open);
          }}
        >
          <Card.Header
            position="relative"
            flexDirection="row"
            alignItems="center"
            gap="3"
            // Collapsed, the header is the whole card.
            pb={open ? undefined : "var(--card-padding)"}
          >
            <Collapsible.Trigger asChild>
              <chakra.button
                type="button"
                flex="1"
                minW="0"
                textAlign="start"
                cursor="pointer"
                _after={{ content: '""', position: "absolute", inset: "0" }}
                // The ring goes round the whole header, like the tap target.
                _focusVisible={{
                  outline: "none",
                  _after: {
                    outline: "2px solid",
                    outlineColor: "colorPalette.focusRing",
                    outlineOffset: "-2px",
                    borderRadius: "surface",
                  },
                }}
              >
                {titleNode}
              </chakra.button>
            </Collapsible.Trigger>
            {actionNode}
            <Collapsible.Indicator
              color="fg.muted"
              transition="transform 0.2s"
              _closed={{ transform: "rotate(-90deg)" }}
            >
              <LuChevronDown />
            </Collapsible.Indicator>
          </Card.Header>
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
              {actionNode}
            </Card.Header>
          )}
          {body}
        </>
      )}
    </Card.Root>
  );
};
