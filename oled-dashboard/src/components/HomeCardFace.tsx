import { Text } from "@chakra-ui/react";
import { MdDragIndicator } from "react-icons/md";
import { HOME_CARDS, type HomeCardId } from "../lib/homeLayout";

/**
 * A card's contents plus, while arranging, its drag grip and the stand-in shown
 * when the card itself is hidden right now (no print running, no rain). The
 * stand-in is switched by CSS on whether the card rendered anything — see
 * "Home layout" in index.css — because the card decides that from its own
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
          <div className="home-card-placeholder">
            <Text fontSize="clamp(15px, 2.4vmin, 32px)" color="var(--theme-fg-dim)">
              {label}
            </Text>
            {hiddenHint && (
              <Text fontSize="clamp(12px, 1.8vmin, 24px)" color="var(--theme-fg-faint)">
                Hidden now · {hiddenHint.toLowerCase()}
              </Text>
            )}
          </div>
          <div className="home-card-grip" aria-hidden>
            <MdDragIndicator />
          </div>
        </>
      )}
    </>
  );
}
