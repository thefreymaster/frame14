import { createContext, useContext } from "react";

/**
 * Where a Board is drawn: as a card, which is all it was until 0.171.0;
 * opened out in a modal — /home's cards, cut short so the board fits the
 * screen, show everything there (HomeCardDialog) — where a Board is the
 * modal's header (its title and its action, with the close button) and body;
 * or as one section of a detail panel (0.176.0, EnergyDialog: the Energy
 * page's own cards in the Home card's drawer), where it is its title over a
 * well holding its contents, as the Weather sheet's sections are. The same
 * component each way, so a card's contents are written once.
 */
export type BoardFrameKind = "card" | "modal" | "panel";

export const BoardFrame = createContext<BoardFrameKind>("card");

/** Where the Board this is in is drawn. */
export function useBoardFrame(): BoardFrameKind {
  return useContext(BoardFrame);
}

/**
 * The colour a Board's contents lie on, for what is drawn to match it (a
 * chart's dots are ringed in it): the cards' own, or a panel's well.
 */
export function useBoardSurface(): string {
  return useContext(BoardFrame) === "panel" ? "bg.muted" : "bg.surface";
}
