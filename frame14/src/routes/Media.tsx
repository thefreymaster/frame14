import { Grid, Text } from "@chakra-ui/react";
import { IoPlayCircleOutline } from "react-icons/io5";
import { Board } from "../components/Board";
import { MediaPlayerCard } from "../components/MediaPlayerCard";
import { PageHeader } from "../components/PageHeader";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/ui/empty-state";
import { useEntitiesConfig } from "../hooks/useEntitiesConfig";

const NO_IDS: string[] = [];

/** The cards: one across on a phone, two on the frame, more on a desktop. */
const COLUMNS = "repeat(auto-fill, minmax(min(100%, 22rem), 1fr))";

/**
 * The media players: a MediaPlayerCard per configured player
 * (`media_player_entities`, or the marquee's `media_player_entity` with
 * none) — what is playing, and the controls the player supports.
 */
export function Media() {
  const { data: config, isPending } = useEntitiesConfig();
  const players =
    config?.mediaPlayers && config.mediaPlayers.length > 0
      ? config.mediaPlayers
      : config?.mediaPlayer
        ? [config.mediaPlayer]
        : NO_IDS;

  return (
    <PageShell>
      <PageHeader
        icon={<IoPlayCircleOutline />}
        title="Media"
        actions={
          players.length > 1 && (
            <Text textStyle="sm" color="fg.muted">
              {players.length} players
            </Text>
          )
        }
      />

      {!isPending && players.length === 0 ? (
        <Board>
          <EmptyState
            icon={<IoPlayCircleOutline />}
            title="No media player configured"
            description="Add media_player_entities (or media_player_entity) in the add-on's options."
          />
        </Board>
      ) : (
        <Grid templateColumns={COLUMNS} gap="gutter" alignItems="start">
          {players.map((id) => (
            <MediaPlayerCard key={id} entityId={id} />
          ))}
        </Grid>
      )}
    </PageShell>
  );
}
