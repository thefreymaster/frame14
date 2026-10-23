import { Grid, Skeleton, Text } from "@chakra-ui/react";
import { IoImagesOutline } from "react-icons/io5";
import { AlbumSelect } from "../components/AlbumSelect";
import { Board } from "../components/Board";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { PhotoGrid } from "../components/PhotoGrid";
import { EmptyState } from "../components/ui/empty-state";
import { useAlbumPhotos } from "../hooks/useAlbumPhotos";
import { usePhotosConfig } from "../hooks/usePhotosConfig";

/**
 * A remote's Photos page (the frames have the slideshow): the album picker and
 * every photo in the album, the frames' one highlighted; tap one to show it.
 */
export function Album() {
  const { data: config, isPending: configPending } = usePhotosConfig();
  const albumId = config?.defaultAlbumId ?? null;
  const {
    data: album,
    isPending: photosPending,
    isError,
  } = useAlbumPhotos(albumId);
  const loading = configPending || (albumId !== null && photosPending);

  return (
    <PageShell>
      <PageHeader
        icon={<IoImagesOutline />}
        title="Photos"
        actions={
          album && (
            <Text textStyle="sm" color="fg.muted">
              {album.assets.length} photos
            </Text>
          )
        }
      >
        <AlbumSelect />
      </PageHeader>

      <Board>
        {loading ? (
          <Grid templateColumns="repeat(auto-fill, minmax(6rem, 1fr))" gap="2">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} aspectRatio="1" rounded="sm" />
            ))}
          </Grid>
        ) : !albumId ? (
          <EmptyState
            icon={<IoImagesOutline />}
            title="no album configured"
            description="Pick one above."
          />
        ) : isError || !album ? (
          <EmptyState
            icon={<IoImagesOutline />}
            title="couldn't load the album"
          />
        ) : album.assets.length === 0 ? (
          <EmptyState icon={<IoImagesOutline />} title="no photos" />
        ) : (
          <PhotoGrid albumId={albumId} assets={album.assets} />
        )}
      </Board>
    </PageShell>
  );
}
