# Changelog

## v1.1.0

Sound, voice chat, a drag-sort that actually tracks your finger, and a set of
rule and reliability fixes.

### Added

- **Sound effects** for drawing, discarding, sweeping the discard pile,
  dealing, your turn, and rejected actions.

  Effects fire off changes in the broadcast game state rather than from
  inside each action handler. The handlers only know about the local player's
  own moves, so hooking them would have left opponents' turns silent — and
  because the server is the authority, an action it rejects stays quiet on
  its own.

  Card noises are short CC0 recordings (Kenney); the UI cues stay
  synthesised, since tones are exact and cost nothing while a synthesised
  card is only ever an approximation. The registry takes several formats per
  sound and picks the first the browser reports it can decode, falling back
  to synthesis when none are playable — the shipped files are `.ogg`, which
  Safari has long refused, and the alternative was silence on iPhones.
  `canPlayType` is only ever a guess, so a source that fails at playback
  demotes itself too.

  Mute toggle, remembered per browser.

- **Voice chat**: opt-in, full-mesh WebRTC. At most three peers each in a 2–4
  player room. Audio never passes through the server, which only brokers the
  handshake. Only the arriving peer places calls, so two sides can't offer at
  once and collide.

  Uses public STUN with no TURN relay: behind a symmetric NAT or a
  restrictive firewall, a pair may fail to find a path, and there is nothing
  to fall back on.

### Changed

- **Drag-to-sort** now tracks the finger. The held card follows the pointer
  and lifts off the fan, instead of sitting still until the order happened to
  change. Dragging near either edge auto-scrolls the hand — without it, a
  card simply couldn't reach a position that was off-screen. The meld
  search — a bitmask DP over the whole hand — no longer runs mid-gesture,
  since the highlight can't be right until the card lands.

- **Closing blind from the deck is gone**, client and server. It drew a card
  and ended the round automatically if it happened to fit, leaving the player
  no decision. Closing now always means drawing into hand and choosing which
  card to set aside as the tutupan.

- **The salip rule is stricter.** The overtaken player must now be above the
  threshold *both before and after* the round, and the overtake must be
  strict:

  | Case | Before | Now |
  |---|---|---|
  | 150 → 40, overtaken | burned | safe |
  | 150 → −70, overtaken | burned (gained 70) | safe |
  | 120 → 120, scores level | burned | safe |
  | 150 → 150, genuinely overtaken | burned | burned |

  Checking only the prior score burned players who had already collapsed
  during the round, which reads as unfair when the number on screen is well
  under the threshold. Treating a draw as an overtake burned players nobody
  had actually passed. Requiring the score to be high at both ends also stops
  a negative score being reset to 0, which had been turning the penalty into
  a reward.

  Verified across 2,025 two-player and 594 three-player score combinations:
  no burn now violates any of the three conditions.

### Fixed

- **Every action failed after a silent socket reconnect.** socket.io
  reconnects on its own after a network blip, a backgrounded tab, or the
  tunnel dropping, and comes back with a new socket id — but the client only
  sent its token on the very first connect, so the server treated the
  reconnected socket as a stranger. Verified against a live server: every
  action rejected with "Not authenticated", with nothing on screen to suggest
  a reload was needed.

  Voice chat dying and needing to be switched back on was the visible symptom
  of this, not the whole of it.

  Three parts: re-send the token on every connect; rejoin voice once the
  reconnected socket has re-authenticated, dropping the peer connections tied
  to the dead session first since none of them recover; and bind the seat to
  the live socket inside `VOICE_JOIN`. That last one was an ordering gap the
  test caught — the client sends `VOICE_JOIN` before it re-sends `JOIN_ROOM`,
  so the seat still pointed at the dead socket and every peer's offer was
  relayed into the void, leaving the roster empty even though `VOICE_JOIN`
  had been accepted.

- Sound and voice controls were missing from the mini-game screen.

## v1.0.0

Ceki Online — Indonesian rummy built on the Vintage Poker stack (Express +
MongoDB + JWT + Socket.io + React).

Full Ceki rules: 55-card deck, 7-card hands, meld validation with joker
impersonation, tutupan and ceburan closes, deck-exhaustion scoring, and
cumulative scoring to a host-chosen target. Rooms with 6-character share
codes for 2–4 players, reconnect by account identity, and a between-round tap
penalty for the sole last-place player.

A portrait-first mobile table on a rotated felt, kept separate from the
untouched desktop layout, with collapsible opponent melds, stickers, a
scoreboard, deal animation, and online/offline dots.

Deployment: `npm run build` publishes the client into `server/public` (the
only directory Express serves), `npm run tunnel` supervises a Cloudflare
quick tunnel, and `render.yaml` plus `DEPLOY.md` cover hosting.
