import { useState } from "react";
import { Box, Card, Collapsible } from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";

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
 * The raised tile every section sits on: Chakra's Card in the `raised`
 * variant (src/theme/recipes/card.ts), optionally collapsible.
 *
 * A collapsible board is a Collapsible whose trigger is the card header, so the
 * open/close animation and the chevron come from the library. Collapse state
 * persists per board in localStorage under `board-collapsed:<key>`.
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
    typeof title === "string" ? (
      <Card.Title fontSize="sm" fontWeight="500" letterSpacing="normal">
        {title}
      </Card.Title>
    ) : (
      title
    );

  const body = (
    <Card.Body flex={fill ? "1" : undefined} minH={fill ? "0" : undefined}>
      {children}
    </Card.Body>
  );

  return (
    <Card.Root
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
              textAlign="start"
              cursor="pointer"
              userSelect="none"
              color="inherit"
              transition="padding-bottom 280ms ease"
              // A collapsed board pulls its header down onto the content edge,
              // so the gap goes away with the content.
              _closed={{ pb: "0" }}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <Box flex="1" minW="0" color="fg.dim">
                {titleNode}
              </Box>
              <Collapsible.Indicator
                color="fg.faint"
                fontSize="20px"
                display="flex"
                alignItems="center"
                transition="transform 280ms ease"
                transform="rotate(-90deg)"
                _open={{ transform: "rotate(0deg)" }}
              >
                <FiChevronDown />
              </Collapsible.Indicator>
            </Card.Header>
          </Collapsible.Trigger>
          <Collapsible.Content>{body}</Collapsible.Content>
        </Collapsible.Root>
      ) : (
        <>
          {title != null && (
            <Card.Header>
              <Box flex="1" minW="0" color="fg.dim">
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
