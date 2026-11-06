import { useEntitiesConfig } from "./useEntitiesConfig";

/**
 * Whether photos are set up (0.162.0: an album in `immich_album_ids`; Immich's
 * address and key from 0.145.0), from /api/entities' `photos`. True until the config says
 * otherwise, so a page that has it can't flicker its Photos out and back.
 */
export function usePhotosEnabled(): boolean {
  const { data } = useEntitiesConfig();
  return data?.photos !== false;
}
