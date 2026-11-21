import { useState } from "react";
import { Box, Text } from "@chakra-ui/react";
import NumberFlow from "@number-flow/react";
import { IoAmericanFootball } from "react-icons/io5";
import {
  sides,
  stateLabel,
  text,
  type Game,
  type Side,
} from "../lib/teamTracker";
import {
  BROADCAST,
  LAYOUT_VAR,
  SCOREBOARD,
  UNIT_VAR,
  WIDE,
  u,
  unitCss,
} from "../lib/scoreboardLayout";
import { FootballDetail } from "./FootballDetail";

/**
 * The /football page's score bug, at the scale of a television scoreboard.
 *
 * **Portrait is the real target.** The frame is a 1600x2400 panel, so the
 * broadcast arrangement — cap | team | clock | team | cap across one row —
 * does not fit: the two caps and the centre block alone claim about two thirds
 * of the width and crush the names and scores into what is left. There the
 * same parts stack instead, one team per full-width row with the clock as a
 * band between them, which is also how a stadium scoreboard reads. A wide box
 * keeps the broadcast row, where there is width to spend.
 *
 * **It goes by its own box, not the window** (0.178.1, lib/scoreboardLayout):
 * the root is a size container, every length is a multiple of a unit of that
 * box (`u`), and the arrangement — `tall`, `wide` or `broadcast` — is a
 * container query's. The styles without a query are `tall`'s; WIDE and
 * BROADCAST carry what differs. All three are the same DOM, so there is one
 * tree to keep correct rather than three.
 *
 * The home card's chip is deliberately a separate component: its sizes are
 * tuned for a tile inside the bento and are far too small here. The game model
 * both draw is shared, in lib/teamTracker.ts.
 */

/** The small print's floor: a phone's unit takes it under 10px. */
const SMALL_PRINT = "0.6875rem";

/** Colour block carrying the helmet logo, with a stripe of the second colour. */
function LogoCap({ side, edge }: { side: Side; edge: "left" | "right" }) {
  const [broken, setBroken] = useState(false);

  return (
    <Box
      data-team-cap=""
      position="relative"
      flexShrink={0}
      alignSelf="stretch"
      bg={side.color}
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
      opacity={side.lost ? 0.45 : 1}
      transition="opacity 400ms ease"
      css={{
        // Stacked, the cap leads every row, so it can be narrower.
        width: u(17),
        padding: `0 ${u(1.6)}`,
        [BROADCAST]: { width: u(20) },
      }}
    >
      {side.logo && !broken ? (
        // Plain <img>: Chakra v3's polymorphic Box drops the img-only props.
        <img
          src={side.logo}
          alt={side.abbr}
          style={{
            maxHeight: "60%",
            maxWidth: "100%",
            objectFit: "contain",
          }}
          onError={() => setBroken(true)}
        />
      ) : (
        <Text
          fontWeight="700"
          color="#FFFFFF"
          letterSpacing="0.04em"
          maxW="100%"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          fontSize={u(5)}
        >
          {side.abbr}
        </Text>
      )}
      <Box
        position="absolute"
        top="0"
        bottom="0"
        width={u(1.2)}
        bg={side.trim}
        css={{
          // Stacked, every cap is on the left, so the stripe faces inward.
          right: 0,
          left: "auto",
          [BROADCAST]:
            edge === "left"
              ? { right: 0, left: "auto" }
              : { left: 0, right: "auto" },
        }}
      />
    </Box>
  );
}

/** AP poll rank, the number college broadcasts put ahead of the name. */
function Rank({ side }: { side: Side }) {
  return (
    <Text
      as="span"
      fontSize={u(2.6)}
      fontWeight="700"
      color={side.trim}
      letterSpacing="0.02em"
      mr={u(1)}
      verticalAlign={u(0.6)}
    >
      #{side.rank}
    </Text>
  );
}

/**
 * The strip under a team's name: the down when that team has the ball,
 * otherwise its remaining timeouts, otherwise a plain colour rule.
 */
function StatusBar({ side }: { side: Side }) {
  if (side.down) {
    return (
      <Box
        data-team-down=""
        alignSelf="center"
        bg={side.color}
        borderRadius={u(0.4)}
        px={u(1.6)}
        py={u(0.3)}
      >
        <Text
          fontSize={u(2.2)}
          fontWeight="600"
          color="#FFFFFF"
          letterSpacing="0.08em"
          whiteSpace="nowrap"
        >
          {side.down}
        </Text>
      </Box>
    );
  }

  // The stacked rows have the width for a longer strip — and it is the
  // part of the line that gives when a row hasn't (TeamRow).
  const strip = { width: u(22), minWidth: 0, [BROADCAST]: { width: u(11) } };

  if (side.timeouts != null) {
    return (
      <Box display="flex" gap={u(0.8)} height={u(1.2)} css={strip}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            flex="1"
            height="100%"
            borderRadius={u(0.4)}
            bg={side.color}
            opacity={i < side.timeouts! ? 1 : 0.25}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box
      height={u(1.2)}
      borderRadius={u(0.4)}
      bg={side.color}
      css={strip}
    />
  );
}

function Score({ side }: { side: Side }) {
  const n = Number(side.score);

  return (
    <Box
      data-team-score=""
      gridArea="score"
      // A flex box, so the rolling digits' own box is the score's height —
      // in a line of text it sat on the baseline and the line grew half as
      // tall again, which is what pushed the name against the row's top.
      display="flex"
      alignItems="center"
      fontWeight="500"
      lineHeight="1"
      color="fg"
      opacity={side.lost ? 0.5 : 1}
      transition="opacity 400ms ease"
      css={{
        // A stacked row is a team's own, so the score can be much bigger.
        fontSize: u(22),
        // The rolling digits' box is half as tall again as the type, the
        // room they fade through above and below a figure: the score counts
        // for its type's height, and that room lies over its neighbours'.
        marginBlock: "-0.25em",
        [BROADCAST]: { fontSize: u(13) },
      }}
    >
      {/* Digits roll the way a stadium scoreboard flips them. */}
      {Number.isFinite(n) ? <NumberFlow value={n} /> : side.score}
    </Box>
  );
}

/**
 * One team: colour cap, name and status, then the score.
 *
 * `edge` is which end of the broadcast row this team sits at, and only matters
 * there — the home side mirrors so both teams face the clock. Stacked, both
 * rows read left to right, like a scoreboard.
 *
 * The name, the status line and the score are a grid's three areas. `tall`
 * has the name on a line of its own over the other two: sharing a line with
 * the score is what cut long names short on the upright frame, where the
 * score always won. `wide` — rows with width to spare and no height — stands
 * the score beside both.
 */
function TeamRow({
  side,
  edge,
  venue,
  live,
}: {
  side: Side;
  edge: "left" | "right";
  /** HOME or AWAY — the sensor knows, and the score bug never said. */
  venue: string;
  /** Down and timeouts only mean anything once the ball is in play. */
  live: boolean;
}) {
  const mirrored = edge === "right";

  return (
    <Box
      data-team={venue.toLowerCase()}
      display="flex"
      minW="0"
      bg="bg.muted"
      css={{
        // Every arrangement fills. The content scales with the row rather
        // than sitting small inside it — a stretched row holding a couple of
        // lines would be the huge static colour slab the OLED constraints
        // rule out, but a filled one is a scoreboard.
        flex: "1 1 0%",
        minHeight: 0,
        flexDirection: "row",
        [BROADCAST]: { flexDirection: mirrored ? "row-reverse" : "row" },
      }}
    >
      <LogoCap side={side} edge={edge} />

      <Box
        data-team-body=""
        flex="1"
        minW="0"
        display="grid"
        alignContent="center"
        alignItems="center"
        css={{
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gridTemplateAreas: `"name name" "status score"`,
          columnGap: u(2.4),
          rowGap: u(1.6),
          padding: `${u(2)} ${u(2.6)}`,
          [WIDE]: {
            gridTemplateAreas: `"name score" "status score"`,
            rowGap: u(1.2),
            // The score is as tall as both lines and more: keep the two
            // together at its middle rather than a line at each end of it.
            "& > [data-team-name]": { alignSelf: "end" },
            "& > [data-team-status]": { alignSelf: "start" },
          },
          // Across one row the width is what runs out: closer in.
          [BROADCAST]: { padding: `${u(3)} ${u(2.2)}`, columnGap: u(1.6) },
        }}
      >
        <Text
          data-team-name=""
          gridArea="name"
          fontWeight="600"
          color="fg"
          letterSpacing="0.03em"
          lineHeight="1.2"
          minW="0"
          opacity={side.lost ? 0.5 : 1}
          transition="opacity 400ms ease"
          overflow="hidden"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          css={{
            fontSize: u(6),
            textAlign: "left",
            [BROADCAST]: {
              fontSize: u(3.2),
              textAlign: mirrored ? "right" : "left",
            },
          }}
        >
          {live && side.down && (
            <Box
              as="span"
              display="inline-flex"
              verticalAlign={u(-0.4)}
              mr={u(1.4)}
              color={side.trim}
              fontSize={u(3.4)}
              aria-label="has possession"
            >
              <IoAmericanFootball />
            </Box>
          )}
          {side.rank && <Rank side={side} />}
          {side.name}
        </Text>

        <Box
          data-team-status=""
          gridArea="status"
          display="flex"
          alignItems="center"
          minW="0"
          gap={u(1.6)}
        >
          {/* What gives when the line is longer than its row: the strip of
              timeouts first, as short as it must be; then the record, cut
              with an ellipsis rather than drawn over the score. Never the
              down chip, whose fill would stop short of its own text. */}
          <Text
            fontWeight="500"
            color="fg.muted"
            letterSpacing="0.12em"
            lineHeight="1.5"
            whiteSpace="nowrap"
            minW="0"
            overflow="hidden"
            textOverflow="ellipsis"
            flexShrink={1}
            css={{
              fontSize: u(3.2),
              [BROADCAST]: { fontSize: u(1.9) },
            }}
          >
            {venue}
            {side.record ? `  ·  ${side.record}` : ""}
          </Text>
          {live && (
            <Box
              display="flex"
              minW="0"
              css={{ flexShrink: side.down ? 0 : 1000 }}
            >
              <StatusBar side={side} />
            </Box>
          )}
        </Box>

        {side.score != null && <Score side={side} />}
      </Box>
    </Box>
  );
}

/** Game state — period and clock live, kickoff before, FINAL after. */
function CenterBlock({ game }: { game: Game }) {
  return (
    <Box
      data-scoreboard-clock=""
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg"
      css={{
        // Stacked: a full-width band between the two teams.
        width: "100%",
        padding: `${u(2)} ${u(3)}`,
        [WIDE]: { padding: `${u(1.5)} ${u(3)}` },
        [BROADCAST]: {
          width: "auto",
          minWidth: u(20),
          padding: `${u(2)} ${u(2)}`,
          alignSelf: "stretch",
        },
      }}
    >
      <Text
        fontWeight="500"
        color="fg"
        letterSpacing="0.08em"
        whiteSpace="nowrap"
        textAlign="center"
        css={{
          fontSize: u(8),
          lineHeight: 1.5,
          [WIDE]: { lineHeight: 1.2 },
          [BROADCAST]: { fontSize: u(5) },
        }}
      >
        {stateLabel(game)}
      </Text>
    </Box>
  );
}

/**
 * Win probability as a tug-of-war: the rope sits where ESPN thinks the game
 * is, and slides as it swings. Live games only — before kickoff it's noise,
 * and after the final it's decided.
 */
function WinBar({ away, home }: { away: Side; home: Side }) {
  const awayProb = away.winProb;
  const homeProb = home.winProb;
  if (awayProb == null || homeProb == null) return null;

  const total = awayProb + homeProb;
  if (!(total > 0)) return null;
  const awayPct = Math.round((awayProb / total) * 100);

  return (
    <Box
      data-scoreboard-odds=""
      display="flex"
      flexDirection="column"
      alignItems="stretch"
      gap={u(1)}
      width="100%"
      flexShrink={0}
      bg="bg.subtle"
      px={u(2.6)}
      py={u(2)}
    >
      <Box display="flex" justifyContent="space-between" alignItems="baseline">
        <Text
          fontSize={u(2.6, SMALL_PRINT)}
          fontWeight="600"
          color={away.color === "#3A3A42" ? "fg" : away.trim}
        >
          {awayPct}%
        </Text>
        <Text
          fontSize={u(2, SMALL_PRINT)}
          color="fg.muted"
          letterSpacing="0.14em"
        >
          WIN PROBABILITY
        </Text>
        <Text
          fontSize={u(2.6, SMALL_PRINT)}
          fontWeight="600"
          color={home.color === "#3A3A42" ? "fg" : home.trim}
        >
          {100 - awayPct}%
        </Text>
      </Box>
      <Box
        position="relative"
        height={u(1.4)}
        width="100%"
        borderRadius={u(0.7)}
        overflow="hidden"
      >
        <Box display="flex" height="100%" width="100%">
          <Box
            width={`${awayPct}%`}
            height="100%"
            bg={away.color}
            transition="width 900ms ease"
          />
          <Box flex="1" height="100%" bg={home.color} />
        </Box>
        {/* Two schools can wear nearly the same red, so mark the split itself. */}
        <Box
          position="absolute"
          top="0"
          bottom="0"
          left={`${awayPct}%`}
          width={u(0.8)}
          ml={u(-0.4)}
          bg="bg"
          transition="left 900ms ease"
        />
      </Box>
    </Box>
  );
}

/** Where and on what — the frame at the top of the card. */
function MetaStrip({ game }: { game: Game }) {
  const a = game.attributes;
  const left = [text(a.league) ?? text(a.sport), text(a.tv_network)]
    .filter(Boolean)
    .join("   ·   ");
  const right = text(a.venue) ?? text(a.location);
  if (!left && !right) return null;

  return (
    <Box
      data-scoreboard-strip=""
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      gap={u(2)}
      flexShrink={0}
      bg="bg.subtle"
      px={u(2.6)}
      py={u(1.8)}
    >
      <Text
        fontSize={u(2.2, SMALL_PRINT)}
        fontWeight="500"
        color="fg"
        letterSpacing="0.16em"
        whiteSpace="nowrap"
        textTransform="uppercase"
      >
        {left}
      </Text>
      <Text
        fontSize={u(2.2, SMALL_PRINT)}
        color="fg.muted"
        letterSpacing="0.1em"
        minW="0"
        overflow="hidden"
        whiteSpace="nowrap"
        textOverflow="ellipsis"
      >
        {right}
      </Text>
    </Box>
  );
}

export function FootballScoreboard({ game }: { game: Game }) {
  const [away, home] = sides(game);
  const live = game.state === "IN";

  return (
    // The box the scoreboard measures: a size container, so a length in it
    // can be a share of this box and the arrangement a query of its shape.
    <Box
      data-scoreboard=""
      minW="0"
      width="100%"
      borderRadius="l3"
      overflow="hidden"
      bg="bg.subtle"
      css={{
        flex: "1 1 0%",
        minHeight: 0,
        containerType: "size",
        containerName: SCOREBOARD,
      }}
    >
      {/* A query styles what is inside its container, never the container:
          the unit is set here, one box in. */}
      <Box
        data-scoreboard-board=""
        display="flex"
        flexDirection="column"
        height="100%"
        minW="0"
        css={{
          [UNIT_VAR]: unitCss("tall"),
          [LAYOUT_VAR]: "tall",
          [WIDE]: { [UNIT_VAR]: unitCss("wide"), [LAYOUT_VAR]: "wide" },
          [BROADCAST]: {
            [UNIT_VAR]: unitCss("broadcast"),
            [LAYOUT_VAR]: "broadcast",
          },
        }}
      >
        <MetaStrip game={game} />

        {/* Stacked, the two teams have the clock between them; the broadcast
            row lays all three out across. */}
        <Box
          data-scoreboard-teams=""
          display="flex"
          minW="0"
          css={{
            // Fills in every arrangement, so the two rows have a height to
            // share rather than leaving the bottom of the card empty.
            flex: "1 1 0%",
            minHeight: 0,
            flexDirection: "column",
            [BROADCAST]: { flexDirection: "row" },
          }}
        >
          <TeamRow side={away} edge="left" venue="AWAY" live={live} />
          <CenterBlock game={game} />
          <TeamRow side={home} edge="right" venue="HOME" live={live} />
        </Box>

        {game.state === "IN" && <WinBar away={away} home={home} />}

        <FootballDetail game={game} />
      </Box>
    </Box>
  );
}
