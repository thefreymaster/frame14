import { defineLayerStyles, defineTextStyles } from "@chakra-ui/react";

export const textStyles = defineTextStyles({
  /** A card's section label: "CLIMATE", "TODAY". */
  section: {
    value: { fontSize: "2.2vmin", letterSpacing: "0.1em", fontWeight: "400" },
  },
  /** The summary figure at the right of a card header: "62%", "3 ON". */
  meta: {
    value: { fontSize: "1.8vmin", letterSpacing: "0.06em", fontWeight: "500" },
  },
  /** A small caps line over a figure: "NOW", "REMAINING", "3D PRINTER". */
  eyebrow: {
    value: { fontSize: "2.2vmin", letterSpacing: "0.16em", fontWeight: "400" },
  },
  /** Large numeric readouts. */
  numeral: {
    value: {
      fontFamily: "display",
      fontWeight: "300",
      lineHeight: "1",
      letterSpacing: "-0.04em",
    },
  },
});

export const layerStyles = defineLayerStyles({
  /** The second elevation step, nested inside a card. */
  chip: {
    value: {
      bg: "surface.chip",
      borderRadius: "chip",
      paddingInline: "chipX",
      paddingBlock: "chipY",
    },
  },
  /** A chip that is on — running, selected, soonest. */
  chipOn: {
    value: {
      bg: "surface.on",
      borderRadius: "chip",
      paddingInline: "chipX",
      paddingBlock: "chipY",
    },
  },
});
