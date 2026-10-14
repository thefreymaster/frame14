import { HStack, Heading, Icon } from "@chakra-ui/react";

/** A card's section label, with an optional leading icon. */
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
    <Heading
      as="h2"
      textStyle="section"
      color="fg"
      lineHeight="1.5"
      fontFamily="body"
    >
      {children}
    </Heading>
  );
  if (!icon) return label;
  return (
    <HStack gap="1vmin" align="center">
      <Icon color={iconColor ?? "fg"} boxSize="2.4vmin">
        {icon}
      </Icon>
      {label}
    </HStack>
  );
};
