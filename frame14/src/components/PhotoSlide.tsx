import { keyframes } from "@emotion/react";
import { Box } from "@chakra-ui/react";

// Ken Burns drift — no stock keyframe does a slow zoom.
const slowZoom = keyframes`
  from { transform: scale(1); }
  to { transform: scale(1.2); }
`;

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
      animation={visible ? `${slowZoom} 30s linear forwards` : "none"}
    />
  );
}
