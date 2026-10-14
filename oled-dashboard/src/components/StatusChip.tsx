import { Tag } from "@chakra-ui/react";

/**
 * A single ambient chip — Chakra's Tag in the `chip` variant, the second
 * elevation step nested inside a card or the status strip.
 *
 * Chips carry their own edges, so a label and its value stay next to each
 * other instead of being flung to opposite sides of a 1600px panel. Children
 * are either a `<Tag.Label>` or a row of text (the bird chip).
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
      variant="chip"
      size="panel"
      aria-label={label}
      flex={grow ? "1" : "0 1 auto"}
      minW="0"
    >
      {icon && <Tag.StartElement color="fg.faint">{icon}</Tag.StartElement>}
      {children}
    </Tag.Root>
  );
}
