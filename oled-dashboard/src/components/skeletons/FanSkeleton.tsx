import { Grid, Skeleton } from "@chakra-ui/react";
import { useEntitiesConfig } from "../../hooks/useEntitiesConfig";

/** Placeholder for <FanSection>'s buttons: one per configured fan. */
export function FanSkeleton() {
  const { data: config } = useEntitiesConfig();
  const count = config?.fans?.length || 1;

  return (
    <Grid templateColumns="repeat(auto-fill, minmax(14rem, 1fr))" gap="3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="11" />
      ))}
    </Grid>
  );
}
