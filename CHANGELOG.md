# Changelog

## v1.4.0

Google sign-in, a searchable lobby, deploy fixes, and a `npm run dev` crash
that hit every Node 18 machine.

### Added

- **Google sign-in**, alongside the existing email/password login. The
  browser gets an ID token from Google's own button; the server verifies its
  signature and audience against Google and issues the same JWT the password
  login does, so sockets, reconnect and the game itself neither know nor care
  how a user signed in.

  Accounts are matched on the Google subject id first, the email second, so
  someone who already registered with a password lands on their existing
  account instead of a duplicate. A colliding display name gets a number
  appended rather than failing with a database error.

  The client id is committed in both configs rather than left to an
  environment variable — it is public by nature, visible in the page source
  of any site offering Google sign-in, and this flow carries no client
  secret. The first deploy actually broke on exactly this: the server-side
  copy of the variable never reached the Render runtime for reasons that
  stayed unexplained, taking sign-in down with a message no player could act
  on. Committing it removes that failure mode outright.

- **A searchable room lobby.** Rooms are created with a name and listed for
  anyone to find — joining no longer depends on somebody handing you a
  six-character code. Only rooms still waiting for players are listed
  (joining anything else is refused anyway), fullest first. Search covers the
  name, the code and the host's name; typing a full code also offers a direct
  join button, since that room might not be listed at all.

- **`SETUP.md`** plus example env files (`server/config/local.env.example`,
  `client/.env.local.example`), for running this on a machine that isn't the
  one it was built on. Walked through end to end on a clean clone with no env
  files at all: install, build, server up, registration and login actually
  succeeding.

### Fixed

- **`npm run dev` crashed on Node 18** — the exact version this project is
  pinned to — with `error:0308010C:digital envelope routines::unsupported`.
  `npm run build` never hit this because its script sets
  `NODE_OPTIONS=--openssl-legacy-provider` itself; dev mode went straight to
  `react-scripts start` with no flag at all, so it broke for anyone running
  it, not just one machine. New `scripts/dev-client.js` sets the same flag
  dev mode was missing. Verified on Node 18.20.4: compiles and serves clean.

- **A completed hand could be impossible to close after taking from the
  discard pile.** Ceki eligibility was only recomputed on discard, so melding
  from the pile changed the hand without ever refreshing it — the player
  could not announce Ceki, and therefore could not close, until they
  discarded and waited a full turn.

- **Taking from the discard pile accepted support that wasn't yours.** The
  rule requires at least two cards from your own hand; the check only counted
  the selection, and those could include cards swept up from the pile itself
  — a take could be propped up by one hand card, or by none at all. Both were
  being accepted.

- **Registration failures read as "Request failed with status code 400".**
  The server answered "Invalid credentials" for a taken email *or* a taken
  nickname alike — wording that reads as "wrong password" on a signup form —
  and the client discarded even that, showing axios's own string instead. Now
  says which one and what to do; easy to hit since signing in with Google
  creates an account, so registering afterwards with the same address
  collides. Also fixes a session-loading bug that cleared the wrong
  localStorage key on a bad token (`removeItem(token)`, passing the token's
  value as the key), so a bad token was never actually cleared and every
  reload retried it.

- **A deploy without a Contentful space got stuck forever on the loading
  splash**, server perfectly healthy behind it. `createClient` throws on a
  missing space or access token, and the call happened during render — so a
  build without `REACT_APP_CONTENTFUL_*` (every deploy but the one it was
  built on, since that config lives in a gitignored file) died before
  mounting. The app already ships a local content snapshot meant for exactly
  this case; the code just never fell back to it.

- Render's blueprint rejected `numInstances` outright on the free plan, which
  fails the whole blueprint at the first step. Dropped in favour of a comment
  — the free plan is single-instance regardless, which is required anyway
  since room state lives in memory.

- `mongodb-memory-server` and `google-auth-library` had drifted to versions
  requiring Node 20+ and 22+ respectively, newer than the 18.x this project
  is pinned to — every install warned `EBADENGINE`. Downgraded both to
  versions that actually support Node 18.

### Removed

- The "Main sebagai Tamu" one-tap throwaway account button. It only ever
  existed to skip typing credentials while testing against a database that
  reset on every restart; with real persistence, every tap would leave a
  permanent account behind instead.

## v1.3.0

Seating that matches the order play actually goes in, opponent card counts,
and a tidier bottom of the screen.

### Fixed

- **Every player saw a different, mostly wrong, seating.** The server takes
  turns in ascending seat id and wraps around; the client filtered itself out
  of that list, which keeps the ascending order but drops the rotation. Only
  whoever held the lowest seat ever saw an arrangement matching play — at
  seat 3 of 4 the player due to go next was drawn on the far side of the
  table from the two who follow them.

  The list is now rotated to start with whoever plays straight after you, so
  each player sees the table from their own chair. The slots run left → top →
  right, which is clockwise from the bottom where you sit, so play visibly
  travels clockwise for everyone.

  Verified every viewpoint at 2, 3 and 4 players against the order the server
  actually takes turns in — 9 of 9 match.

### Added

- **Card counts on opponents' hands.** The cards are stacked nearly on top of
  each other, so counting them by eye is guesswork past three or four — and
  how close an opponent is to going out is the main thing a seat gets read
  for.

### Changed

- **Your own melds moved beside your avatar** and collapse behind a single
  badged card on both desktop and mobile. Laid out in full they occupied a
  whole band of height, which is what pushed the action buttons so far down
  the page.

### Notes

Closing with a joker was checked and already works, in all three forms: as
the tutupan on a normal close, as the tutupan on a ceburan, and standing in
for a missing card inside a meld. A joker set aside as the tutupan is worth
100. A discarded joker still leaves the game outright, so one can never be
taken back off the discard pile.

A comment on `findClosablePartition` claimed the opposite — that a joker can
never be the tutupan. The code has always preferred a natural card but fallen
back to a joker; the comment was simply wrong, in both copies, and is fixed.

## v1.2.0

Mostly a desktop release: manual card sorting never worked there at all, and
the seats were laid out wrong. Also fixes a rule bug that could leave a
finished hand impossible to close.

### Fixed

- **Cards could not be sorted by hand on desktop.** The card slot took a prop
  named `draggable` — a real HTML attribute, so it was forwarded to the div
  and turned every card into a native HTML5 drag source. On a mouse the
  browser's own drag took over on the first movement and fired
  `pointercancel`, killing the custom reorder before it began. Touch never
  triggers native drag, which is why only desktop was affected. The prop had
  only ever been meant to pick a cursor shape.

- **A completed hand could be impossible to close.** Ceki eligibility was
  computed in exactly one place, inside `discardCard`. Melding cards from the
  discard pile changes the hand without going through it, so eligibility went
  stale: the player could not announce Ceki, and since closing requires that
  announcement, could not close either — even with everything already melded.
  They had to discard and wait a full turn.

  Eligibility is now recomputed whenever the hand changes, and measured
  against where in the turn the player is: *one card away* while resting,
  *closable right now* once they have drawn. An announcement is only
  withdrawn on the resting hand, so a claim made last turn survives drawing a
  card that happens not to close.

- **Desktop seats were placed by index, not by player count**, so two
  opponents took "left" and "middle" instead of sitting across from each
  other. Now: one opponent goes top, two go left and right, three go left,
  top and right.

- **The middle seat rendered at full size** beside half-size neighbours and
  covered the discard pile. It centred itself with an inline
  `transform: translateX(-50%)`, and an inline transform beats the stylesheet
  outright — it was silently cancelling the slot's own scale. It now centres
  with a full-width slot and flexbox, leaving `transform` free for the scale.

- **Slot scaling was dead on wide screens.** Every transform in
  `PositionedUISlot` lived inside a media query capped at 1068px, so on an
  ordinary monitor no rule matched and `scale` was ignored entirely — seats
  rendered at full size straight over the felt.

- **The desktop felt filled the viewport by itself.** It keeps the table
  image's ~2:1 ratio, so a flat 900px width made it tall enough to push
  "Melds saya", the hand and the action buttons below the fold, where they
  read as missing rather than as scrolled past. Its width is now capped
  against viewport height too.

### Changed

- The player's own melds collapse behind a single badged card on mobile, the
  way opponents' melds already did. Laid out in full they pushed the hand
  down the page. Opens upward, since they sit near the bottom of the screen.
- Desktop side seats sit down on the felt at roughly mid-height instead of
  hanging above its top edge.

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
