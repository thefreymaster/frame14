import { Box, Text, VStack } from "@chakra-ui/react";
import { PageShell } from "../components/PageShell";
import { FootballScoreboard } from "../components/FootballScoreboard";
import { useLiveGame } from "../hooks/useLiveGame";

/**
 * The whole panel given over to a game while one is on.
 *
 * The server routes every frame here when a tracked team kicks off and sends
 * them back when it's over (see the football watcher in ha-socket.js), so like
 * /marquee this page doesn't decide whether it should be showing — it draws
 * whatever games are in the window and says so plainly when there are none.
 */
export function Football() {
  const { games } = useLiveGame();

  if (games.length === 0) {
    return (
      <PageShell fill>
        <Box
          flex="1"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text
            fontSize="3vmin"
            color="var(--theme-fg-faint)"
            letterSpacing="0.1em"
          >
            no game in session
          </Text>
        </Box>
      </PageShell>
    );
  }

  return (
    <PageShell fill>
      <VStack align="stretch" gap="1.5vmin" flex="1" minH="0" width="100%">
        {games.map((game) => (
          <FootballScoreboard key={game.entity_id} game={game} />
        ))}
      </VStack>
    </PageShell>
  );
}
