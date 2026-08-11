# Changelog

## v1.0.0

First tagged release. Ceki Online — Indonesian rummy, built on the Vintage
Poker stack (Express + MongoDB + JWT + Socket.io + React).

### Game

- Ceki rules end to end: 55-card deck (52 + 3 jokers), 7-card hands, run/set
  validation with joker impersonation, and the full round state machine —
  draw, meld from the discard pile, tutupan and ceburan closes, and
  deck-exhaustion scoring.
- Rooms: 6-character codes, 2–4 players, reconnect by account identity, and a
  between-round tap penalty for whoever sits alone in last place.
- Cumulative scoring to a host-chosen 500 or 1000, with the "salip" house
  rule.

### Interface

- Portrait-first mobile table on a rotated felt, kept entirely separate from
  the desktop layout.
- Drag-to-sort hand: the held card follows the finger and lifts, and dragging
  near either edge scrolls the hand so off-screen positions are reachable.
- Opponent melds collapse to a single badged card and open into a popover
  that floats above the felt, so a seat in the narrow strip beside the table
  never overlaps its own hand.
- Online/offline dot on every avatar.
- Stickers, scoreboard, deal animation.

### Sound and voice

- Sound effects for drawing, discarding, sweeping the discard pile, dealing,
  your turn, and rejected actions. Card noises are short CC0 recordings
  (Kenney); UI cues stay synthesised. The registry accepts several formats
  per sound and picks the first the browser can decode, falling back to
  synthesis rather than silence when none are playable.
- Opt-in full-mesh WebRTC voice chat. Audio never passes through the server,
  which only brokers the handshake. Uses public STUN with no TURN relay, so a
  symmetric NAT or restrictive firewall can leave a pair unable to connect.

### Fixes

- **Every action failed after a silent socket reconnect.** socket.io
  reconnects on its own and returns with a new socket id, but the client only
  sent its token on the first connect, so the server treated the reconnected
  socket as a stranger — every action rejected with "Not authenticated", with
  nothing on screen to suggest a reload. Voice chat dying was the visible
  symptom of this, not the whole of it.
- **A leaving host made the room permanently unusable.** The host was assumed
  to be seat 1, and leaving vacated it, so nobody could ever start a round
  again and the room could not be dismissed either.
- **Leaving mid-round on your own turn deadlocked the room.** The turn still
  pointed at the empty seat, which no player could match, so every action
  failed "Not your turn" and the round could not be restarted.
- **A round could start with a single player.** The minimum-player check only
  ran for the first round, so a lone host could deal to nobody.
- **Salip burned players it shouldn't have.** It now requires the overtaken
  player to be above the threshold both before and after the round, and the
  overtake to be strict. Previously a player who had already collapsed during
  the round still burned, a tie counted as an overtake, and a negative score
  reset to 0 — turning the penalty into a reward.
- **Closing blind from the deck is gone.** It drew a card and ended the round
  automatically if it happened to fit, leaving the player no decision.
  Closing now always means drawing into hand and choosing the tutupan card.
- **Cards were invisible on mobile WebKit.** A mount-in fade animation left
  every card stuck at `opacity: 0` — present in the DOM, taking up layout
  space, permanently unseen.
- **A missing `MONGO_URI` in production started anyway**, silently using an
  in-memory database that wiped every account on restart. It now refuses to
  start, naming the actual mistake.

### Deployment

- `npm run build` builds the client *and* publishes it into `server/public`,
  the only directory Express serves. Skipping that copy was silent: the app
  came up fine while serving a stale bundle. Uses `npm ci`, so the same
  commit always produces the same bundle.
- `npm run tunnel` supervises a Cloudflare quick tunnel, restarts it when it
  drops, and writes the current hostname to `.tunnel-url`.
- `render.yaml` blueprint and `DEPLOY.md` covering environment variables and
  the single-instance constraint — room state lives in memory, so a second
  instance would have its own separate set of rooms.
