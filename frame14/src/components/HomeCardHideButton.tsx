import { IconButton } from "@chakra-ui/react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";

/**
 * Hides a card from /home, or brings it back, while arranging: a round button
 * straddling the card's top-left corner, opposite the drag grip and its size
 * — an eye crossed out on a card that shows, an open eye on the stand-in of
 * one that's hidden. Like the width picker it sits inside the card's drag
 * handle, so it keeps its presses to itself: a tap here must toggle the card,
 * never start a drag or a keyboard move.
 */
export function HomeCardHideButton({
  id,
  hidden,
  onChange,
}: {
  id: HomeCardId;
  hidden: boolean;
  onChange: (hidden: boolean) => void;
}) {
  const { label } = HOME_CARDS[id];

  return (
    <IconButton
      aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
      aria-pressed={hidden}
      size="md"
      rounded="full"
      shadow="md"
      position="absolute"
      top="0"
      left="0"
      transform="translate(-30%, -30%)"
      zIndex="1"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={() => onChange(!hidden)}
    >
      {hidden ? <IoEyeOutline /> : <IoEyeOffOutline />}
    </IconButton>
  );
}
