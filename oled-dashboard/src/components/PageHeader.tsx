import { Flex, Spacer } from "@chakra-ui/react";
import { Board } from "./Board";
import { SectionTitle } from "./SectionTitle/SectionTitle";

/**
 * A route's title tile — the same Board + SectionTitle pairing every card on
 * /home uses for its header, so a page title reads at the same weight as a
 * section title instead of shouting at its own scale.
 *
 * `actions` sits right-aligned on the header's row (toggles, a pager, a
 * connection dot). Anything passed as children renders in the tile below it.
 */
export function PageHeader({
  icon,
  iconColor,
  title,
  actions,
  children,
}: {
  icon?: React.ReactNode;
  iconColor?: string;
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Board
      title={
        <Flex
          align="center"
          gap="1.5vmin"
          rowGap="0.8vmin"
          wrap="wrap"
          width="100%"
          minW="0"
        >
          <SectionTitle icon={icon} iconColor={iconColor}>
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
