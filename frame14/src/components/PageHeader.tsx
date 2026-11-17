import { Flex, Spacer } from "@chakra-ui/react";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * A route's title card — the same Board + SectionTitle pairing every card on
 * /home uses for its header. `actions` sits right-aligned on the header row;
 * children render in the card body.
 */
export function PageHeader({
  icon,
  iconColor,
  iconGlow,
  title,
  actions,
  children,
}: {
  icon?: React.ReactNode;
  iconColor?: string;
  /** The icon glows (SectionTitle's `glow`): the Lights page's, while a light is on. */
  iconGlow?: boolean;
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Board
      title={
        <Flex align="center" gap="3" rowGap="2" wrap="wrap" width="100%">
          <SectionTitle icon={icon} iconColor={iconColor} glow={iconGlow}>
            {title}
          </SectionTitle>
          {actions && (
            <>
              <Spacer />
              {actions}
            </>
          )}
        </Flex>
      }
    >
      {children}
    </Board>
  );
}
