import { HStack, Heading, Icon } from "@chakra-ui/react";

/** A card's section heading, with an optional leading icon. */
export const SectionTitle = ({
  children,
  icon,
  iconColor,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
}) => {
  const label = (
    <Heading as="h2" size="md">
      {children}
    </Heading>
  );
  if (!icon) return label;
  return (
    <HStack gap="2" align="center">
      <Icon color={iconColor ?? "fg.muted"} boxSize="5">
        {icon}
      </Icon>
      {label}
    </HStack>
  );
};
