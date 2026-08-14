import { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";
import { CARD_PADDING_X, CARD_PADDING_Y, CARD_RADIUS } from "../lib/surfaces";

const STORAGE_PREFIX = "board-collapsed:";
const ANIM_MS = 280;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const Board = ({
  children,
  onClick,
  title,
  collapsible = false,
  defaultOpen = true,
  storageKey,
  span,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  storageKey?: string;
  /** Span both columns of the home bento grid. Ignored outside a grid. */
  span?: 1 | 2;
}) => {
  const persistKey = collapsible
    ? storageKey || (typeof title === "string" ? slugify(title) : undefined)
    : undefined;
  const fullKey = persistKey ? `${STORAGE_PREFIX}${persistKey}` : undefined;

  const [open, setOpen] = useState<boolean>(() => {
    if (!fullKey) return defaultOpen;
    try {
      const v = localStorage.getItem(fullKey);
      if (v === "1") return false;
      if (v === "0") return true;
    } catch {
      // ignore
    }
    return defaultOpen;
  });

  useEffect(() => {
    if (!fullKey) return;
    try {
      localStorage.setItem(fullKey, open ? "0" : "1");
    } catch {
      // ignore
    }
  }, [open, fullKey]);

  const showHeader = collapsible || !!title;

  return (
    <Box
      width="100%"
      minW="0"
      gridColumn={span === 2 ? "1 / -1" : undefined}
      // Elevation by fill, not outline — see themeMode.ts for why this is the
      // dimmer option on an OLED panel as well as the better-looking one.
      backgroundColor="var(--theme-surface-1)"
      px={CARD_PADDING_X}
      pt={CARD_PADDING_Y}
      pb={CARD_PADDING_Y}
      onClick={!collapsible ? onClick : undefined}
      cursor={onClick && !collapsible ? "pointer" : undefined}
      borderRadius={CARD_RADIUS}
    >
      {showHeader && (
        <Flex
          align="center"
          justify="space-between"
          minH="48px"
          cursor={collapsible ? "pointer" : undefined}
          onClick={
            collapsible
              ? (e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }
              : undefined
          }
          userSelect="none"
          role={collapsible ? "button" : undefined}
          aria-expanded={collapsible ? open : undefined}
          style={{
            marginBottom: 0,
            transition: `margin-bottom ${ANIM_MS}ms ease`,
          }}
        >
          <Box flex="1" minW="0" color="var(--theme-fg-dim)">
            {typeof title === "string" ? (
              <Text fontSize="sm" fontWeight="500" mb="0">
                {title}
              </Text>
            ) : (
              title
            )}
          </Box>
          {collapsible && (
            <Box
              color="var(--theme-fg-faint)"
              fontSize="20px"
              display="flex"
              alignItems="center"
              style={{
                transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                transition: `transform ${ANIM_MS}ms ease`,
              }}
            >
              <FiChevronDown />
            </Box>
          )}
        </Flex>
      )}
      {collapsible ? (
        <Box
          style={{
            display: "grid",
            gridTemplateRows: open ? "1fr" : "0fr",
            transition: `grid-template-rows ${ANIM_MS}ms ease`,
          }}
        >
          <Box style={{ overflow: "hidden", minHeight: 0 }}>{children}</Box>
        </Box>
      ) : (
        children
      )}
    </Box>
  );
};
