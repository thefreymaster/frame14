import { Flex, Skeleton } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";

/** Placeholder for <StatusStrip> — one chip per configured printer and vacuum. */
export function StatusStripSkeleton() {
  const { data: config } = useEntitiesConfig();
  const count = (config?.printer ? 1 : 0) + (config?.vacuums?.length ?? 0);

  return (
    <Flex width="100%" gap="2" wrap="wrap">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="9" width="10rem" rounded="l2" />
      ))}
    </Flex>
  );
}
