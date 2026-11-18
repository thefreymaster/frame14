import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Board } from "../../src/components/Board";
import { GridDirectionBadge } from "../../src/components/GridDirectionBadge";
import { SectionTitle } from "../../src/components/SectionTitle/SectionTitle";
import { BoardFrame } from "../../src/lib/boardFrame";
import { renderWithProviders } from "./helpers/render";

// 0.176.0, the user: "When clicking the energ card from the Home Screen it
// should just show the same energy components as the energy route. Don't
// actually route though still should be in drawer". The page's cards are
// drawn in the drawer by being told where they are (lib/boardFrame's
// "panel"): a Board there is a section — its title and action over a well of
// its contents — whole whatever its collapse. That the drawer holds the
// page's parts is energy.spec's.

const board = (
  <Board collapsible storageKey="panel-test" title={<SectionTitle>Today</SectionTitle>} action={<button>Reset</button>} fill>
    <p>The day's curve</p>
  </Board>
);

describe("a Board in a detail panel", () => {
  it("is a section: its title and action over a well of its contents, no card and nothing to fold", () => {
    const { container } = renderWithProviders(<BoardFrame.Provider value="panel">{board}</BoardFrame.Provider>);
    const section = container.querySelector("[data-board-panel]")!;
    expect(section).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    // The one card in it is the well, which holds the contents — the title is outside it.
    const cards = section.querySelectorAll(".chakra-card__root");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toContainElement(screen.getByText("The day's curve"));
    expect(cards[0]).not.toContainElement(screen.getByRole("heading", { name: "Today" }));
    // No header to tap shut: the only button is the action.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("is whole even where the page's card was folded", () => {
    localStorage.setItem("board-collapsed:panel-test", "1");
    renderWithProviders(<BoardFrame.Provider value="panel">{board}</BoardFrame.Provider>);
    expect(screen.getByText("The day's curve")).toBeVisible();
  });

  it("is a card everywhere else, folding by its header", () => {
    const { container } = renderWithProviders(board);
    expect(container.querySelector("[data-board-panel]")).toBeNull();
    expect(container.querySelector(".chakra-card__root")).toContainElement(screen.getByRole("heading", { name: "Today" }));
    // The header's trigger and the action.
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("takes a plain title as a heading", () => {
    renderWithProviders(
      <BoardFrame.Provider value="panel">
        <Board title="Circuits">rows</Board>
      </BoardFrame.Provider>,
    );
    expect(screen.getByRole("heading", { name: "Circuits" })).toBeInTheDocument();
  });
});

// 0.176.0, the user, of the Now card's header: "add a tag to the header of
// the card says Importing or Exporting depending on what is happenjng".
describe("the grid's direction tag", () => {
  const energy = { currentProduction: 0, currentConsumption: 0, productionToday: 0, consumptionToday: 0 };

  it("says Exporting while the panels make more than the house uses", () => {
    renderWithProviders(<GridDirectionBadge energy={{ ...energy, currentProduction: 5900, currentConsumption: 900 }} />);
    expect(screen.getByText("Exporting")).toHaveAttribute("data-grid-direction", "exporting");
    expect(screen.queryByText("Importing")).toBeNull();
  });

  it("says Importing while the house takes from the grid", () => {
    renderWithProviders(<GridDirectionBadge energy={{ ...energy, currentProduction: 900, currentConsumption: 1200 }} />);
    expect(screen.getByText("Importing")).toHaveAttribute("data-grid-direction", "importing");
    expect(screen.queryByText("Exporting")).toBeNull();
  });
});
