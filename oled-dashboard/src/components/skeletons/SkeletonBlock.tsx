import { Skeleton, type SkeletonProps } from "@chakra-ui/react";

/**
 * Chakra's Skeleton in the dashboard's palette.
 *
 * The stock recipe pulses `bg.emphasized` — a light grey, which is the one
 * thing an OLED page of pure black must not park on screen. Placeholders use
 * the same surface-2 fill as the real chips instead, so they follow the
 * bright/dark swap and stay dim while they breathe.
 */
export function SkeletonBlock(props: SkeletonProps) {
  return (
    <Skeleton
      css={{ background: "var(--theme-surface-2)", "--duration": "1.6s" }}
      {...props}
    />
  );
}
