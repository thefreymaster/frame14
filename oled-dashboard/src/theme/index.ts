import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { globalCss } from "./global-css";
import { keyframes } from "./keyframes";
import { layerStyles, textStyles } from "./styles";
import { semanticTokens, tokens } from "./tokens";
import { buttonRecipe } from "./recipes/button";
import { cardSlotRecipe } from "./recipes/card";
import { dialogSlotRecipe } from "./recipes/dialog";
import { segmentGroupSlotRecipe } from "./recipes/segment-group";
import { sliderSlotRecipe } from "./recipes/slider";
import {
  nativeSelectSlotRecipe,
  switchSlotRecipe,
  tabsSlotRecipe,
} from "./recipes/controls";
import {
  badgeRecipe,
  dataListSlotRecipe,
  emptyStateSlotRecipe,
  progressCircleSlotRecipe,
  progressSlotRecipe,
  statSlotRecipe,
  statusSlotRecipe,
  tagSlotRecipe,
} from "./recipes/data-display";
import {
  actionBarSlotRecipe,
  skeletonRecipe,
  toastSlotRecipe,
  tooltipSlotRecipe,
} from "./recipes/overlays";

/**
 * The dashboard's design system: Chakra's defaults, plus the OLED palette,
 * vmin geometry and recipes that size and colour the library's components for
 * a 1600x2400 wall panel.
 *
 * Recipes here *extend* Chakra's — they add variants (`chip`, `raised`,
 * `panel`, …) and sizes rather than replacing the stock ones. Custom variants
 * are typed by `npm run typegen`, which `npm run build` runs first.
 */
const config = defineConfig({
  globalCss,
  theme: {
    tokens,
    keyframes,
    semanticTokens,
    textStyles,
    layerStyles,
    recipes: {
      button: buttonRecipe,
      badge: badgeRecipe,
      skeleton: skeletonRecipe,
    },
    slotRecipes: {
      actionBar: actionBarSlotRecipe,
      card: cardSlotRecipe,
      dataList: dataListSlotRecipe,
      dialog: dialogSlotRecipe,
      emptyState: emptyStateSlotRecipe,
      nativeSelect: nativeSelectSlotRecipe,
      progress: progressSlotRecipe,
      progressCircle: progressCircleSlotRecipe,
      segmentGroup: segmentGroupSlotRecipe,
      slider: sliderSlotRecipe,
      stat: statSlotRecipe,
      status: statusSlotRecipe,
      switch: switchSlotRecipe,
      tabs: tabsSlotRecipe,
      tag: tagSlotRecipe,
      toast: toastSlotRecipe,
      tooltip: tooltipSlotRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, config);

export default system;
