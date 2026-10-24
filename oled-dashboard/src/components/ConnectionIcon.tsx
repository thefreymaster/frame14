import { chakra } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { MdWifiOff } from "react-icons/md";
import type { ConnectionStatus } from "../lib/connection";

// Material's wifi glyph (react-icons' MdWifi) split into its three parts, so
// each can light on its own: the dot, the middle arc and the outer arc.
const DOT = "M9 17l3 3 3-3a4.237 4.237 0 0 0-6 0z";
const MIDDLE = "M5 13l2 2a7.074 7.074 0 0 1 10 0l2-2C15.14 9.14 8.87 9.14 5 13z";
const OUTER = "M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9z";

// While connecting the parts light up from the dot outwards, hold together,
// and go dim together — an iPhone's Wi-Fi searching for a network.
const CYCLE = "1.6s";
const DIM = 0.3;
const lightUp = (from: number, to: number) => keyframes`
  0%, ${from}% { opacity: ${DIM}; }
  ${to}%, 75% { opacity: 1; }
  90%, 100% { opacity: ${DIM}; }
`;
const PARTS = [
  { d: DOT, lit: lightUp(0, 12) },
  { d: MIDDLE, lit: lightUp(22, 34) },
  { d: OUTER, lit: lightUp(44, 56) },
];

/**
 * The header's connection glyph: the full Wi-Fi icon when connected, the same
 * icon building itself up while connecting (static under reduced motion), and
 * the crossed-out one when disconnected. Chakra's Icon renders its child svg
 * itself and passes it the size, colour and label as props, so they're
 * spread onto the svg here (as react-icons' components do).
 */
export function ConnectionIcon({
  status,
  ...props
}: { status: ConnectionStatus } & React.SVGProps<SVGSVGElement>) {
  if (status === "disconnected") return <MdWifiOff {...props} />;
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      {...props}
    >
      {PARTS.map(({ d, lit }) => (
        <chakra.path
          key={d}
          d={d}
          animation={
            status === "connecting"
              ? `${lit} ${CYCLE} ease-in-out infinite`
              : undefined
          }
          _motionReduce={{ animation: "none" }}
        />
      ))}
    </svg>
  );
}
