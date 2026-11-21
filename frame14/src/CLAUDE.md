# TeamTracker / football subsystem

Scoped notes for the sports feature. Everything else in `src/` follows the root
`CLAUDE.md`; this file exists because the football code is spread across five
directories and has invariants that are easy to break from any one of them.

The rest of the UI is stock Chakra UI (native theme, no custom
palette — see "UI system" in the root `CLAUDE.md`). The score bug is one of the
few hand-drawn graphics left: its surfaces use Chakra tokens (`bg.muted`,
`bg.subtle`, `fg`, `fg.muted`), the team colours are data from the sensor, and
its sizes below are its own — the route's in a unit of the scoreboard's own
box, the home chip's in `vmin`.

## What it is

TeamTracker (HACS) publishes one sensor per tracked team. The state is the game
phase (`PRE` / `IN` / `POST`, plus `BYE` / `NOT_FOUND` which never render) and
the whole game rides along in the attributes. Two surfaces consume it:

- **the home card** — `components/TeamTracker.tsx`, a chip inside the `/home`
  bento, up for the day around a game.
- **the `/football` route** — the whole panel given to the game, all day. Before
  kickoff it is a preview (records instead of scores, kickoff time, countdown);
  during the game it is a scoreboard. The server routes every display here on
  kickoff and away again after the final, the same way Plex playback drives
  `/marquee`. Tapping the home card is the other way in.

## Who owns what

| File                                | Owns                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `lib/teamTracker.ts`                | **The game model.** Attribute types, `sides()`, `stateLabel()`, both visibility windows.  |
| `hooks/useLiveGame.ts`              | The subscription. `useGames(window)` takes the predicate; `useLiveGame()` is the route's. |
| `components/TeamTracker.tsx`        | Card-sized rendering only; re-flows on a narrow card (see below).                         |
| `components/FootballScoreboard.tsx` | Route-sized rendering. Same anatomy, sized by its own box.                                |
| `components/FootballDetail.tsx`     | The band the card has no room for.                                                        |
| `lib/scoreboardLayout.ts`           | The route's three arrangements, the box each is drawn for, and the unit (`u`).            |
| `routes/Football.tsx`               | Composition only.                                                                         |
| `../ha-socket.js`                   | The watcher that decides when the panel switches.                                         |

## Invariants

**One game model.** Anything about _what a game is_ belongs in
`lib/teamTracker.ts`. Both surfaces already agree on away-first ordering, loser
dimming and the period/clock label because they call the same functions — a
second copy of that logic will drift and show two different scores on one
screen.

**Two windows, deliberately different.** `inWindow` is the card's (24h before
kickoff, 6h after the final). `inRouteWindow` is the route's (±30 min). They
share `withinWindows()`; change the constants, not the shape. The _auto-route_
is narrower still — it fires on the `IN` edge only, so the panel is never
yanked off what you were doing before kickoff.

**`"football"` must stay in `TRANSIENT_VIEWS`.** That set is what stops
`setLastRoute()` writing the view to the `route_entity` input_select
(`input_select.oledos_route` here; an option since 0.145.0), which the motion
watcher reads back on wake. Drop it and a motion trip next Tuesday
strands the panel on a finished game. And since 0.129.0 the motion watcher
leaves the frames alone while `io.currentView` is a transient view other than
blank — a walk past the kitchen sensor during a game used to send the panel
back to the saved route — so `onMotionOn` reads that set too.

**The watcher is edge-triggered on `state` only.** Attributes churn every few
seconds during a game; only the phase can start or end the view. This is why
`publishState` compares `prevState?.state !== newState.state`.

**The post-prime `onFootballState()` call is load-bearing.** Cache priming
writes `stateCache` directly and never calls `publishState`, and a live game
holds `IN` while only attributes change — so without that one call a server
restart at kickoff means the panel never shows the game _at all_, for the whole
game. It is not a nicety.

**Handing back to the marquee.** When a game ends, the watcher returns to
`marquee` if the media player is still playing *a movie*, else `home`. The media
watcher only sends the panel home from `io.currentView === "marquee"`, so
returning to `home` unconditionally would leave a movie playing with nothing
showing it — and returning to `marquee` for an episode or live TV would strand
the panel on a view that refuses to draw them.

**`EMPTY` is a module constant on purpose.** `useEntities` memoises on the
joined id string but its effect depends on the array identity; a fresh `[]` each
render churns the socket subscriptions.

**Team logos use a plain `<img>`, not Chakra's `Box`.** The polymorphic `Box`
in Chakra v3 drops img-only props. This broke the addon build once already
(0.39.1 was the fix).

## Portrait is the target — and the box, not the window, is the measure

The frame is 1600x2400. The broadcast arrangement the home chip uses — cap |
team | clock | team | cap across one row — **does not fit in portrait**: the two
caps plus the centre block claim about two thirds of 1600px and crush the names
and scores into what is left. So `FootballScoreboard` stacks there: one team per
full-width row with the clock as a band between them. Same DOM every way, so
there is one tree to keep correct.

**It goes by its own box** (0.178.1, `lib/scoreboardLayout.ts`). It used to go by
the window — every size a `vmin`, the broadcast row whenever the window was
landscape — and that is only right while the page has the whole screen. With a
game pinned over the app on the frame (Android's split screen) the window is
1600x1490, landscape by a hair: the broadcast row was drawn in a third less
width than it takes, the names cut to "F…" and both scores over the clock (the
user: "the football should be more responsive for smaller screen sizes like
this"). Now the scoreboard's root is a **size container** (`data-scoreboard`),
every length in it is `u(n)` — `n` of `--scoreboard-unit`, set one box in, on
`data-scoreboard-board`, since a container query styles what is inside its
container — and the arrangement is a container query's:

| Arrangement | Box it is drawn for (units) | Where                                                  | What it is                                                             |
| ----------- | --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `tall`      | 96.5 x 126                  | the upright frame, a phone                             | a row a team, the name over its score, the clock a band between        |
| `wide`      | 121 x 104                   | the frame with its screen shared, a squarish window    | the same rows with no height to spare: the score beside name and line  |
| `broadcast` | 184 x 72                    | a desktop, a phone on its side, a short slice of frame | cap, team, clock, team, cap across one row                             |

The unit is whichever of the box's sides runs out first
(`min(100cqw / width, 100cqh / height)`), so an arrangement always fits the box
it is in — and two games on one day, half the page each, each fit theirs. On the
upright frame a unit is 16px, the `vmin` every size was written in: **the frame's
sizes are unchanged**, and a size here still reads as it did (a 22-unit score is
352px there). `wide` starts at a box 24:25 (where it and `tall` come to the same
unit, so the score doesn't jump) and `broadcast` at 17:10 — between a shared
frame's widest box and a 16:9 desktop's page. The styles without a query are
`tall`'s; `WIDE` and `BROADCAST` are the style keys for what differs, and never
hold at once. `--scoreboard-layout` says which the stylesheet picked, for the
tests; `scoreboardLayoutFor` / `scoreboardUnit` are the same rule in numbers,
and football.spec holds the two together.

**The boxes are arithmetic, not taste.** Each width is what a team's line takes
at its longest — in `wide`, a ranked team of fourteen letters with the ball
beside a two-figure score; in `broadcast`, the record, the down chip and a
two-figure score side by side, twice, plus the caps and "4TH 12:45" — and each
height is the strip, the clock band, the odds, the play and two rows. The
broadcast row was drawn by the window's height alone before, and on a 16:9
desktop a 28 ran into the clock; it is about a tenth smaller there now, and
fits. If you change a size, redo the sum for its box (and for 1600x2400, where
a unit is 16px) before assuming it fits; football.spec draws the worst line at
every size.

A team's name, its status line (HOME / AWAY, record, then the down chip or the
timeouts) and its score are **a grid's three areas** (`data-team-body`). In
`tall` and `broadcast` the name has a line of its own over the other two —
sharing a line with the score is what repeatedly truncated long names
("FLORIDA ST…"): the score is the widest thing on the page and always won. In
`wide` the row has width to spare and no height, so the score stands beside
both. When a line is still longer than its row, the strip of timeouts gives
first (it shrinks), then the record is cut with an ellipsis; the down chip never
shrinks, or its fill stops short of its own text. Nothing is drawn over the
score.

The score is a flex box round NumberFlow, with `margin-block: -0.25em`: the
rolling digits' own box is half as tall again as the type (the room they fade
through), and in a line of text it grew the line by as much again — which is
what pushed the name against the top of its row before 0.178.1. Measure a score
by its own rect, less that quarter top and bottom.

It **fills the panel in every arrangement**, and the sizes are chosen so it fills
with content — a 22-unit score, a colour block sized to hold a logo at 60% of the
row height. An earlier pass stretched the rows without scaling anything, which
gave each team a ~290x980px slab of solid colour behind two lines of text:
sparse, and a big static block of saturated colour on a wall. If you grow the
rows, grow what is in them.

The small print — the strip (league, network, stadium), the odds' labels, the
play — has a floor of 11px (13 for the down), which only a phone's unit reaches.
The team rows' own lines have none: in the broadcast row on a phone's side a
floor is wider than the row.

The home chip (`TeamTracker`) re-flows too, and also by its own box: below
`NARROW` (`@container (max-width: 36rem)`, a phone or a small landscape window)
its row becomes a grid of one team per row — cap, then name and score — with the
clock band between. The row keeps its vmin sizes, tuned for the frame; the
stacked rows use rem, because on a phone `1vmin` is under 4px. Each part's `css`
carries only the stacked overrides, so the frame and landscape rows are
untouched. Keep the wide values as props: Chakra's `HStack`/`VStack` set `gap`
and `flexDirection` as props, and an unconditional `css` value for those loses
to them (the route's parts are plain `Box`es for that reason).

## Arriving mid-game (closed in 0.145.0)

A display that connects _after_ the server broadcasts — a browser opened
mid-game, the frame's morning restart, a reload after a server restart — used
to stay on Home: `SocketViewListener` acted on `change_view` and ignored the
`current_view` it is sent on connect (`/marquee` had the same gap since
0.36.0). Since 0.145.0 `lib/arrivalView.ts` takes the page's **first**
`current_view` (a `socket.once` registered as main.tsx imports it, so a quick
connect can't beat the listener) and a frame goes there when it is football,
marquee or — on its two days — halloween. Only those: they are up for their
own reason and end on their own. An everyday view or blank is left alone, as
are later reconnects, so a socket blip never yanks a frame off a page its user
chose; a remote and /control never move. The automation e2e spec covers the
football case and the everyday one, and resets the server's view after
(`io.currentView` outlives a test, and every later page would open on the
game).

## Testing without waiting for Saturday

There is no live game most of the time, and hand-editing the sensor in HA gets
overwritten on the integration's next poll. Drive it with a stub HA WebSocket
instead — a server that answers `auth_required` / `auth_ok`, returns one
teamtracker entity from `get_states`, acks `subscribe_events`, and pushes
`state_changed` events on demand. Point the addon at it with
`HA_URL=http://127.0.0.1:8123 HA_TOKEN=x`, connect a `socket.io-client` that
logs `change_view`, and step the sensor through the phases.

Worth covering, because each one failed for a different reason while this was
being built:

1. `PRE → IN` routes in.
2. `IN → POST` returns home after the hold (shorten `FOOTBALL_FINAL_HOLD_MS`).
3. Start with the sensor already `IN` and send **no** state change — the
   post-prime path must still route.
4. Media player `playing` — the return goes to `marquee`, not `home`.

Give the stub realistic attributes — colours, ranks, records, timeouts, win
probabilities, `down_distance_text`, `possession` matching `team_id`,
`last_play`, `tv_network`, `venue`. A stub with only abbreviations renders a
page that looks broken for reasons that have nothing to do with the code.

Screenshot all three phases: `PRE` (preview — no scores, no timeouts, no
possession), `IN` (full scoreboard), `POST` (`FINAL`, loser dimmed, and no
possession marker — ESPN leaves `down_distance_text` on the sensor after the
whistle, so it has to be gated on the state).
