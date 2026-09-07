# TeamTracker / football subsystem

Scoped notes for the sports feature. Everything else in `src/` follows the root
`CLAUDE.md`; this file exists because the football code is spread across five
directories and has invariants that are easy to break from any one of them.

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
| `components/TeamTracker.tsx`        | Card-sized rendering only.                                                                |
| `components/FootballScoreboard.tsx` | Route-sized rendering. Same anatomy, its own `vmin` scale.                                |
| `components/FootballDetail.tsx`     | The band the card has no room for.                                                        |
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
`setLastRoute()` writing the view to `input_select.oledos_route`, which the
motion watcher reads back on wake. Drop it and a motion trip next Tuesday
strands the panel on a finished game.

**The watcher is edge-triggered on `state` only.** Attributes churn every few
seconds during a game; only the phase can start or end the view. This is why
`publishState` compares `prevState?.state !== newState.state`.

**The post-prime `onFootballState()` call is load-bearing.** Cache priming
writes `stateCache` directly and never calls `publishState`, and a live game
holds `IN` while only attributes change — so without that one call a server
restart at kickoff means the panel never shows the game _at all_, for the whole
game. It is not a nicety.

**Handing back to the marquee.** When a game ends, the watcher returns to
`marquee` if the media player is still playing, else `home`. The media watcher
only sends the panel home from `io.currentView === "marquee"`, so returning to
`home` unconditionally would leave a movie playing with nothing showing it.

**`EMPTY` is a module constant on purpose.** `useEntities` memoises on the
joined id string but its effect depends on the array identity; a fresh `[]` each
render churns the socket subscriptions.

**Team logos use a plain `<img>`, not Chakra's `Box`.** The polymorphic `Box`
in Chakra v3 drops img-only props. This broke the addon build once already
(0.39.1 was the fix).

## Portrait is the target

The frame is 1600x2400. The broadcast arrangement the home chip uses — cap |
team | clock | team | cap across one row — **does not fit in portrait**: the two
caps plus the centre block claim about two thirds of 1600px and crush the names
and scores into what is left. `FootballScoreboard` therefore re-flows on
`@media (orientation: ...)`: portrait stacks one team per full-width row with the
clock as a band between them, landscape keeps the broadcast row. Same DOM both
ways, so there is one tree to keep correct.

It **fills the panel in both orientations**, and the sizes are chosen so it fills
with content — a 22vmin score, a colour block sized to hold a logo at 60% of the
row height. An earlier pass stretched the rows without scaling anything, which
gave each team a ~290x980px slab of solid colour behind two lines of text: sparse,
and the static bright element the OLED constraints rule out. If you grow the
rows, grow what is in them.

The name and the score sit on **separate lines**, not side by side. Sharing a
line is what repeatedly truncated long names ("FLORIDA ST…") — the score is the
widest thing on the page and always won. The short status line (HOME/AWAY,
record, timeouts or the down) shares the score's line instead, and must be
`flexShrink: 0` or the down chip's background stops short of its own text.

If you change any `vmin` size here, redo the arithmetic for 1600x2400 before
assuming it fits — `1vmin` is 16px on that panel, so `18vmin` is a 288px glyph.

## Known gap

A display that connects _after_ the server broadcasts — reconnecting from a
server restart, or a browser opened mid-game — does not navigate.
`SocketViewListener` acts on `change_view` but ignores the `current_view` it is
sent on connect. `io.currentView` is correct, so everything else stays
consistent. `/marquee` has had the same gap since 0.36.0. Closing it means
having frame-mode devices honour `current_view` on connect, which changes
behaviour for every view, not just this one.

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
