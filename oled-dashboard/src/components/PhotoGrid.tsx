import { useEffect, useRef } from "react";
import { Badge, Box, Grid } from "@chakra-ui/react";
import { IoTvOutline } from "react-icons/io5";
import type { ImmichAsset } from "../hooks/useAlbumPhotos";
import { showPhoto, usePhotosShown } from "../lib/slideshow";

/**
 * Every photo in the album, in the slideshow's order, as small square tiles
 * (Immich's small thumbnails, loaded as they scroll into view). The photo a
 * frame is on wears a ring and an "On frame" badge; a tap puts that photo up
 * on the frames. Opens scrolled to the photo on screen.
 */
export function PhotoGrid({
  albumId,
  assets,
}: {
  albumId: string;
  assets: ImmichAsset[];
}) {
  const shown = usePhotosShown();
  const gridRef = useRef<HTMLDivElement>(null);
  // Scroll to the frame's photo once per album, not each time it moves on:
  // that would pull the grid out from under a thumb mid-scroll.
  const scrolledFor = useRef<string | null>(null);

  useEffect(() => {
    if (scrolledFor.current === albumId) return;
    const id = shown.find((s) => assets.some((a) => a.id === s));
    if (!id) return;
    scrolledFor.current = albumId;
    gridRef.current
      ?.querySelector(`[data-asset-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [albumId, assets, shown]);

  return (
    <Grid
      ref={gridRef}
      templateColumns="repeat(auto-fill, minmax(6rem, 1fr))"
      gap="2"
    >
      {assets.map((asset, i) => {
        const onFrame = shown.includes(asset.id);
        return (
          <Box
            as="button"
            key={asset.id}
            data-asset-id={asset.id}
            aria-label={`Show photo ${i + 1} on the frame`}
            aria-pressed={onFrame}
            onClick={() => showPhoto({ albumId, assetId: asset.id })}
            position="relative"
            aspectRatio="1"
            overflow="hidden"
            rounded="sm"
            bg="bg.muted"
            cursor="pointer"
            focusVisibleRing="outside"
            outline={onFrame ? "3px solid" : undefined}
            outlineColor="blue.solid"
            outlineOffset="2px"
          >
            <img
              src={`/api/photos/asset/${asset.id}/thumbnail?size=thumbnail`}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {onFrame && (
              <Badge
                position="absolute"
                top="1.5"
                left="1.5"
                size="sm"
                variant="solid"
                colorPalette="blue"
              >
                <IoTvOutline />
                On frame
              </Badge>
            )}
          </Box>
        );
      })}
    </Grid>
  );
}
