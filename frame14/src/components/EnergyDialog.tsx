import { useState } from "react";
import { BoardFrame } from "../lib/boardFrame";
import type { EnergyTab } from "../hooks/useEnergyTabs";
import { EnergyPanels } from "./EnergyPanels";
import { PanelDialog } from "./PanelDialog";

/**
 * The energy card's detail: the Energy page's own parts in a drawer
 * (0.176.0, the user: "When clicking the energ card from the Home Screen it
 * should just show the same energy components as the energy route. Don't
 * actually route though still should be in drawer"). EnergyPanels, as the
 * page has it — Now with the power flow, then Solar (today's card over the
 * month or year chart) and Circuits — each Board drawn as a panel's section,
 * its title over a well (lib/boardFrame's `"panel"`). It had a today's chart
 * and split totals of its own from 0.142 until then, which the page never
 * had.
 *
 * Nothing routes: the tab is the dialog's own, as the dialog isn't in the
 * address, and it opens on Solar each time (the panel unmounts on close —
 * and with it Circuits' poll, which runs only once that tab is looked at).
 */
export function EnergyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <PanelDialog open={open} onClose={onClose} title="Energy">
      <BoardFrame.Provider value="panel">
        <Panels />
      </BoardFrame.Provider>
    </PanelDialog>
  );
}

/**
 * The panels with the tab they are on: the dialog's contents unmount as it
 * closes (PanelDialog), so every opening starts on Solar.
 */
function Panels() {
  const [tab, setTab] = useState<EnergyTab>("solar");
  return <EnergyPanels tab={tab} onTab={setTab} />;
}
