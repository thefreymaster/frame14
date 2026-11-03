import { useEntitiesConfig } from "./useEntitiesConfig";

/**
 * Whether Immich is set up (0.145.0: `immich_url` and `immich_api_key` are
 * optional), from /api/entities' `photos`. True until the config says
 * otherwise, so a page that has it can't flicker its Photos out and back.
 */
export function usePhotosEnabled(): boolean {
  const { data } = useEntitiesConfig();
  return data?.photos !== false;
}
