import { Navigate } from "react-router";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";
import { featuresOf, type Feature } from "../lib/features";

/**
 * A page that needs something set up (lib/features, 0.159.0): once the
 * entity config says the install hasn't, a visit — a bookmark, an
 * automation's change_view, the address typed in — goes Home instead. While
 * the config loads the page renders as usual, so one that has it never
 * bounces.
 */
export function RequireFeature({
  feature,
  children,
}: {
  feature: Feature;
  children: React.ReactNode;
}) {
  const { data } = useEntitiesConfig();
  if (data && !featuresOf(data)[feature]) return <Navigate to="/home" replace />;
  return children;
}
