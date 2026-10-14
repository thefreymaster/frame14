import { Card, Circle, Icon } from "@chakra-ui/react";
import { MdDragIndicator } from "react-icons/md";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";

/**
 * A card's contents plus, while arranging, its drag grip and the stand-in shown
 * when the card itself is hidden right now (no print running, no rain). The
 * stand-in is switched by CSS on whether the card rendered anything — see
 * "Home layout" in src/index.css — because the card decides that from its own
 * subscriptions and never tells this component.
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
          {/* Sized like Board, so a stand-in matches the cards around it. */}
          <Card.Root
            className="home-card-placeholder"
            size={{ base: "sm", md: "md" }}
            borderRadius="sm"
            borderStyle="dashed"
          >
            <Card.Body>
              <Card.Title>{label}</Card.Title>
              {hiddenHint && (
                <Card.Description>
                  Hidden now · {hiddenHint.toLowerCase()}
                </Card.Description>
              )}
            </Card.Body>
          </Card.Root>
          {/* Straddles the card's corner rather than sitting inside it, where
              it would cover header text like the weather or the energy chip. */}
          <Circle
            aria-hidden
            position="absolute"
            top="0"
            right="0"
            transform="translate(30%, -30%)"
            size="10"
            bg="colorPalette.solid"
            color="colorPalette.contrast"
            shadow="md"
            pointerEvents="none"
          >
            <Icon boxSize="5">
              <MdDragIndicator />
            </Icon>
          </Circle>
        </>
      )}
    </>
  );
}
