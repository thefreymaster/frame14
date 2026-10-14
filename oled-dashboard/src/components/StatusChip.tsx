import { Tag } from "@chakra-ui/react";

/**
 * A single ambient chip — Chakra's Tag. Children are either a `<Tag.Label>`
 * or a row of text (the bird chip).
 */
export function StatusChip({
  icon,
  children,
  grow = false,
  label,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Take the rest of the row. */
  grow?: boolean;
  label?: string;
}) {
  return (
    <Tag.Root
      as="div"
      size="xl"
      variant="surface"
      aria-label={label}
      flex={grow ? "1" : "0 1 auto"}
      minW="0"
      gap="2"
      py="1.5"
    >
      {icon && <Tag.StartElement>{icon}</Tag.StartElement>}
      {children}
    </Tag.Root>
  );
}
