import { createContext } from "react";

/**
 * Where a Board is drawn: as a card, which is all it was until 0.171.0, or
 * opened out in a modal — /home's cards, cut short so the board fits the
 * screen, show everything there (HomeCardDialog). The same component, so a
 * card's contents are written once: in a modal a Board is the modal's header
 * (its title and its action, with the close button) and body.
 */
export const BoardFrame = createContext<"card" | "modal">("card");
