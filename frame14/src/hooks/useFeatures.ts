import { featuresOf, type Feature, type Features } from "../lib/features";
import { useEntitiesConfig } from "./useEntitiesConfig";

/** What this install has set up (lib/features), from its entity config. */
export function useFeatures(): Features {
  return featuresOf(useEntitiesConfig().data);
}

/**
 * Whether a feature's data is to be asked for: `enabled` once the config has
 * loaded and says the feature is set up, so an install without it never asks
 * (0.159.0); `waiting` while the config loads, when a card's placeholder
 * holds rather than going blank.
 */
export function useFeatureData(feature: Feature): {
  enabled: boolean;
  waiting: boolean;
} {
  const { data } = useEntitiesConfig();
  return {
    enabled: data != null && featuresOf(data)[feature],
    waiting: data == null,
  };
}
