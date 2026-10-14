import { Card, Circle, Icon } from "@chakra-ui/react";
import { MdDragIndicator } from "react-icons/md";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";

/**
 * A card's contents plus, while arranging, its drag grip and the stand-in shown
 * when the card itself is hidden right now (no print running, no rain). The
 * stand-in is switched by CSS on whether the card rendered anything — see
 * "Home layout" in src/theme/global-css.ts — because the card decides that
 * from its own subscriptions and never tells this component.
 */
export function HomeCardFace({
  id,
  editing,
  children,
}: {
  id: HomeCardId;
  editing: boolean;
  children: React.ReactNode;
}) {
  const { label, hiddenHint } = HOME_CARDS[id];

  return (
    <>
      <div className="home-card-body">{children}</div>
      {editing && (
        <>
          <Card.Root
            className="home-card-placeholder"
            justifyContent="center"
            gap="0.6vmin"
            minH="10vmin"
            outline="0.2vmin dashed {colors.divider}"
            outlineOffset="-0.2vmin"
          >
            <Card.Title
              fontSize="clamp(15px, 2.4vmin, 32px)"
              fontWeight="400"
              color="fg.dim"
            >
              {label}
            </Card.Title>
            {hiddenHint && (
              <Card.Description
                fontSize="clamp(12px, 1.8vmin, 24px)"
                color="fg.faint"
              >
                Hidden now · {hiddenHint.toLowerCase()}
              </Card.Description>
            )}
          </Card.Root>
          {/* Straddles the card's corner rather than sitting inside it, where
              it would cover header text like the weather or the energy chip. */}
          <Circle
            aria-hidden
            position="absolute"
            top="0"
            right="0"
            transform="translate(30%, -30%)"
            size="clamp(32px, 5vmin, 64px)"
            bg="surface.on"
            color="fg"
            boxShadow="0 0.4vmin 1.2vmin rgba(0, 0, 0, 0.6)"
            pointerEvents="none"
          >
            <Icon boxSize="clamp(18px, 3vmin, 40px)">
              <MdDragIndicator />
            </Icon>
          </Circle>
        </>
      )}
    </>
  );
}
