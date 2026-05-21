import { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { FiChevronDown } from "react-icons/fi";
import { useColorModeValue } from "./ui/color-mode";

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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  storageKey?: string;
}) => {
  const bg = useColorModeValue("white", "black");
  const border = useColorModeValue("gray.100", "#ffffff24");
  const headerColor = useColorModeValue("gray.700", "gray.200");
  const iconColor = useColorModeValue("gray.500", "gray.400");

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
      minWidth="100%"
      backgroundColor={bg}
      border={`1px solid`}
      borderColor={border}
      pl="4"
      pr="4"
      pt="2"
      onClick={!collapsible ? onClick : undefined}
      cursor={onClick && !collapsible ? "pointer" : undefined}
      borderRadius="sm"
      style={{
        paddingBottom: collapsible && !open ? "0.5rem" : "1rem",
        transition: `padding-bottom ${ANIM_MS}ms ease`,
      }}
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
          <Box flex="1" minW="0" color={headerColor}>
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
              color={iconColor}
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
