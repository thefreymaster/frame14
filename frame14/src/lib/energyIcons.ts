import { GenIcon } from "react-icons";

// Material Design Icons' transmission tower (transmission-tower): a pylon
// carrying high-voltage lines, the glyph Home Assistant's own energy
// dashboard draws for the grid. The energy flow's grid node wears it
// (0.176.0, the user, of the lightning bolt it had: "Is there a better icon
// to represent the grid? Like high voltage power lines") — a bolt is
// electricity anywhere, and the Circuits tab's; the tower is the grid.
// react-icons' sets have utility poles and broadcast masts, no pylon.

export const TransmissionTowerIcon = GenIcon({
  tag: "svg",
  attr: { viewBox: "0 0 24 24", fill: "currentColor" },
  child: [
    {
      tag: "path",
      attr: {
        d: "M8.28,5.45L6.5,4.55L7.76,2H16.23L17.5,4.55L15.72,5.44L15,4H9L8.28,5.45M18.62,8H14.09L13.3,5H10.7L9.91,8H5.38L4.1,10.55L5.89,11.44L6.62,10H17.38L18.1,11.45L19.89,10.56L18.62,8M17.77,22H15.7L15.46,21.1L12,15.9L8.53,21.1L8.3,22H6.23L9.12,11H11.19L10.83,12.35L12,14.1L13.16,12.35L12.81,11H14.88L17.77,22M11.4,15L10.5,13.65L9.32,18.13L11.4,15M14.68,18.12L13.5,13.64L12.6,15L14.68,18.12Z",
      },
      child: [],
    },
  ],
});
