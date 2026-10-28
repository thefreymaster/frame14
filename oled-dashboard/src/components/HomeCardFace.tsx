import { Card, Circle, Icon } from "@chakra-ui/react";
import { MdDragIndicator } from "react-icons/md";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";

/**
 * A card's contents plus, while arranging, its drag grip and the stand-in shown
 * when the card itself is hidden right now (no print running, no rain). The
 * stand-in is switched by CSS on whether the card rendered anything — see
 * "Home layout" in src/index.css — because the card decides that from its own
 * subscriptions and never tells this component.
 *
 * A card its user has hidden (`hidden`, the eye while arranging) has no
 * contents at all, so the stand-in is all there is of it, and its line says
 * how to bring it back rather than when it would show.
 */
export function HomeCardFace({
  id,
  editing,
  hidden = false,
  children,
}: {
  id: HomeCardId;
  editing: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  const { label, hiddenHint } = HOME_CARDS[id];

  return (
    <>
      {!hidden && <div className="home-card-body">{children}</div>}
      {editing && (
        <>
          {/* Sized like Board, so a stand-in matches the cards around it. */}
          <Card.Root
            className="home-card-placeholder"
            size={{ base: "sm", md: "md" }}
            borderStyle="dashed"
          >
            <Card.Body>
              <Card.Title>{label}</Card.Title>
              {hidden ? (
                <Card.Description>Hidden · the eye shows it again</Card.Description>
              ) : (
                hiddenHint && (
                  <Card.Description>
                    Hidden now · {hiddenHint.toLowerCase()}
                  </Card.Description>
                )
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
