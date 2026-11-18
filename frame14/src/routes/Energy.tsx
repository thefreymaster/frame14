import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { IoFlash } from "react-icons/io5";
import { EnergyPanels } from "../components/EnergyPanels";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import {
  isEnergyTab,
  useEnergyTabs,
  type EnergyTab,
} from "../hooks/useEnergyTabs";

/**
 * The /energy page: its header over the energy views (EnergyPanels — the Now
 * card, then the Solar and Circuits tabs; the Home card's drawer shows the
 * same parts). The tab is the sub-route (0.138; the `tab` search param
 * before): /energy/solar and /energy/circuits, so the old /power path can
 * land on its tab. The page alone, a tab it hasn't got, or the old `?tab=`
 * lands on the right one. The page itself needs the solar sensors or the
 * circuits (RequireFeature).
 */
export function Energy() {
  const tabs = useEnergyTabs();
  const navigate = useNavigate();
  const { tab: raw } = useParams();
  const [params] = useSearchParams();
  const has = (v: string | null | undefined): v is EnergyTab =>
    isEnergyTab(v) && tabs.some((t) => t.value === v);
  if (!has(raw)) {
    const legacy = params.get("tab");
    return (
      <Navigate
        to={`/energy/${has(legacy) ? legacy : (tabs[0]?.value ?? "solar")}`}
        replace
      />
    );
  }

  return (
    <PageShell fill>
      <PageHeader icon={<IoFlash />} title="Energy" />
      <EnergyPanels
        page
        tab={raw}
        onTab={(next) => void navigate(`/energy/${next}`, { replace: true })}
      />
    </PageShell>
  );
}
