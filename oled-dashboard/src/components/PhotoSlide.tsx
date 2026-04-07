import { Box } from "@chakra-ui/react";

interface Props {
  assetId: string;
  visible: boolean;
}

export function PhotoSlide({ assetId, visible }: Props) {
  return (
    <Box
      position="absolute"
      inset={0}
      backgroundImage={`url(/api/photos/asset/${assetId}/thumbnail)`}
      backgroundSize="cover"
      backgroundPosition="center"
      backgroundRepeat="no-repeat"
      transition="opacity 1.5s ease-in-out"
      opacity={visible ? 1 : 0}
    />
  );
}
