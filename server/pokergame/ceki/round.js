// Ceki round state machine — pure(ish) functions operating on a Table
// instance (see server/pokergame/Table.js) and its `seats`. Ported from the
// Ceki reference implementation's server/game/GameEngine.js, adapted from
// its Map<playerId,...>-based engine object to this project's Table/Seat
// class model (state lives on `table` and `table.seats[seatId]` directly).
const Deck = require('../Deck');
const { cardValue } = require('./cardUtils');
const {
  findPerfectPartition,
  findClosablePartition,
  validateMeld,
  bestMeldedSubset,
  isOneCardAwayFromClosed,
} = require('./combinations');
const {
  MAX_DISCARD_TAKE,
  MIN_SUPPORT_FROM_HAND,
  SALIP_THRESHOLD,
  JOKER_PENALTY,
} = require('./constants');
const { GameError } = require('./errors');

function activeSeats(table) {
  return Object.values(table.seats)
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);
}

function nextSeatId(table, seatId) {
  const ids = activeSeats(table).map((s) => s.id);
  const idx = ids.indexOf(seatId);
  return ids[(idx + 1) % ids.length];
}

// Computes the total normal-tariff value of a set of melds, correctly
// impersonating jokers as the rank they represent within their meld.
function meldsNormalValue(melds) {
  let total = 0;
  for (const { cards, meld } of melds) {
    for (const card of cards) {
      if (card.isJoker) {
        const assign = meld.jokerAssignments.find((j) => j.jokerId === card.id);
        total += cardValue(card, 'normal', assign.rank);
      } else {
        total += cardValue(card, 'normal');
      }
    }
  }
  return total;
}

function assertPlaying(table) {
  if (table.roundOver) throw new GameError('Round has already ended');
}

// True when some card can be set aside so the rest partitions perfectly --
// i.e. the hand can be closed via tutupan right now. Deliberately mirrors
// closeWithLeftover's own check rather than reusing findClosablePartition,
// which refuses to leave a joker over: closing IS allowed to set a joker
// aside as the tutupan, and a hand only closable that way would otherwise
// never be reported as eligible.
function canCloseWithSomeLeftover(hand) {
  for (let i = 0; i < hand.length; i++) {
    const rest = hand.slice(0, i).concat(hand.slice(i + 1));
    if (findPerfectPartition(rest)) return true;
  }
  return false;
}

// Ceki eligibility depends on where in the turn the player is, so it has to
// be re-evaluated every time their hand changes -- not only when they
// discard, which is all that used to happen. Taking cards from the discard
// pile can complete a hand outright, and with stale eligibility the player
// could not announce Ceki, and therefore could not close, until they had
// discarded and waited a full turn.
//
// `revoke` withdraws an announcement that no longer holds. Only the resting
// hand (after discarding) may do that: mid-turn a player who legitimately
// announced last turn still holds their claim even while holding a drawn
// card that does not happen to close.
function refreshCekiEligibility(seat, { revoke = false } = {}) {
  seat.cekiEligible = seat.hasDrawnThisTurn
    ? canCloseWithSomeLeftover(seat.hand)
    : isOneCardAwayFromClosed(seat.hand);
  if (revoke && !seat.cekiEligible) seat.cekiAnnounced = false;
  return seat.cekiEligible;
}

function isPlayersTurn(table, seatId) {
  return !table.roundOver && table.turn === seatId;
}

function topDiscard(table) {
  return table.discardPile.length
    ? table.discardPile[table.discardPile.length - 1]
    : null;
}

// --- Round lifecycle ----------------------------------------------------

// Deals a fresh round. `startSeatId` sets which seat takes the first turn;
// falls back to the lowest active seat id if not given/invalid.
function startRound(table, startSeatId) {
  const seats = activeSeats(table);
  table.deck = new Deck();
  table.discardPile = [];
  table.discardBy = {};
  table.removedJokers = []; // [{card, seatId}] -- jokers discarded this round, removed from play
  table.turn = seats.some((s) => s.id === startSeatId) ? startSeatId : seats[0].id;
  table.roundOver = false;
  table.endReason = null;
  table.result = null;
  table.round = (table.round || 0) + 1;
  table.winMessages = [];

  for (const seat of seats) {
    seat.resetForNewRound();
    for (let i = 0; i < 7; i++) {
      seat.receiveCard(table.deck.draw());
    }
    seat.turn = seat.id === table.turn;
  }
}

// --- Turn actions ---------------------------------------------------------

function drawFromDeck(table, seatId) {
  assertPlaying(table);
  if (!isPlayersTurn(table, seatId)) throw new GameError('Not your turn');
  const seat = table.seats[seatId];
  if (seat.hasDrawnThisTurn) throw new GameError('You already drew this turn');

  if (table.deck.count() === 0) {
    return endDeckEmpty(table);
  }

  const card = table.deck.draw();
  seat.receiveCard(card);
  seat.hasDrawnThisTurn = true;
  refreshCekiEligibility(seat);
  return { type: 'card-drawn', card, drawPileCount: table.deck.count() };
}

// Takes cards from the top of the discard pile down to (and including) the
// "needed" card (can't skip -- everything above it comes along too), then
// combines that needed card with player-chosen supporting cards into a valid
// meld laid face-up on the table. Supporting cards can come from the
// player's hand AND/OR from the other cards swept up in the same take. Any
// taken cards left unused land in the player's loose hand.
function meldFromDiscard(table, seatId, count, supportingCardIds) {
  assertPlaying(table);
  if (!isPlayersTurn(table, seatId)) throw new GameError('Not your turn');
  const seat = table.seats[seatId];
  if (seat.hasDrawnThisTurn) throw new GameError('You already drew this turn');
  if (!Number.isInteger(count) || count < 1 || count > MAX_DISCARD_TAKE) {
    throw new GameError('Invalid take count');
  }
  if (count > table.discardPile.length) {
    throw new GameError('Not enough cards in discard pile');
  }
  if (!Array.isArray(supportingCardIds) || supportingCardIds.length < 2) {
    throw new GameError('Pilih minimal 2 kartu pendukung');
  }
  if (new Set(supportingCardIds).size !== supportingCardIds.length) {
    throw new GameError('Kartu pendukung duplikat');
  }

  const hand = seat.hand;
  const pileSlice = table.discardPile.slice(
    table.discardPile.length - count,
    table.discardPile.length,
  );
  const neededCard = pileSlice[0]; // deepest card in the taken slice
  const pilePool = pileSlice.slice(1); // other cards swept up alongside it

  if (supportingCardIds.includes(neededCard.id)) {
    throw new GameError('Kartu yang dibutuhkan otomatis ikut, tidak perlu dipilih');
  }

  const supportingCards = [];
  for (const id of supportingCardIds) {
    const card = hand.find((c) => c.id === id) || pilePool.find((c) => c.id === id);
    if (!card) throw new GameError('Kartu pendukung tidak valid');
    supportingCards.push(card);
  }

  const meld = validateMeld([neededCard, ...supportingCards]);
  if (!meld) throw new GameError('Kombinasi tidak valid');

  const isAceSet = meld.type === 'set' && meld.rank === 'A';
  if (meld.type === 'set' && !isAceSet && !seat.discardMeldUnlocked) {
    throw new GameError(
      'Pengambilan pertamamu dari discard pile harus berupa run (kartu berurutan), kecuali kombinasi As',
    );
  }

  const usedFromHand = supportingCards.filter((c) => hand.includes(c));
  const usedFromPile = new Set(supportingCards.filter((c) => pilePool.includes(c)));

  // The two supporting cards must be YOUR OWN. Counting supportingCardIds
  // alone was not enough: those may be drawn from the pile pool too, so a
  // take could be propped up by one hand card and a card swept along with the
  // needed one -- or by none of your own at all.
  if (usedFromHand.length < MIN_SUPPORT_FROM_HAND) {
    throw new GameError(
      `Ambilan dari buangan harus didukung minimal ${MIN_SUPPORT_FROM_HAND} kartu dari tanganmu sendiri`,
    );
  }
  const unusedPileExtras = pilePool.filter((c) => !usedFromPile.has(c));

  const resultingHandSize = hand.length - usedFromHand.length + unusedPileExtras.length;
  if (resultingHandSize < 1) {
    throw new GameError(
      'Tidak bisa mengambil ini — tidak akan ada kartu tersisa untuk dibuang',
    );
  }

  table.discardPile.splice(table.discardPile.length - count, count);
  for (const c of usedFromHand) {
    hand.splice(hand.indexOf(c), 1);
  }
  hand.push(...unusedPileExtras);

  const meldEntry = {
    id: `meld-${seatId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    cards: [neededCard, ...supportingCards],
    meld,
  };
  seat.tableMelds.push(meldEntry);
  seat.hasDrawnThisTurn = true;
  refreshCekiEligibility(seat);

  if (meld.type === 'run' || isAceSet) {
    seat.discardMeldUnlocked = true;
  }

  return {
    type: 'meld-formed',
    meld: meldEntry,
    extras: unusedPileExtras,
    discardPileCount: table.discardPile.length,
  };
}

function discardCard(table, seatId, cardId) {
  assertPlaying(table);
  if (!isPlayersTurn(table, seatId)) throw new GameError('Not your turn');
  const seat = table.seats[seatId];
  if (!seat.hasDrawnThisTurn) throw new GameError('You must draw before discarding');

  const card = seat.discard(cardId);
  if (!card) throw new GameError('Card not in hand');

  if (card.isJoker) {
    // A discarded joker is removed from play instantly -- it never sits on
    // the discard pile and can never be picked up (no ceburan, no meld take).
    // It does NOT void the round; the discarder simply eats a JOKER_PENALTY
    // (-100) applied when the round's score is tallied (see
    // applyJokerDiscardPenalties), same tariff as a joker left idle/unmelded
    // in hand at round end.
    table.removedJokers.push({ card, seatId });
  } else {
    table.discardPile.push(card);
    table.discardBy[card.id] = seatId;
  }
  seat.hasDrawnThisTurn = false;

  // A player who has melded every card to the table and just discarded their
  // last loose card goes out immediately (no Ceki needed for this path -- it
  // falls naturally out of the table-melding mechanic).
  if (seat.hand.length === 0) {
    table.roundOver = true;
    table.endReason = 'closed-meja';
    table.result = buildEmptyHandCloseResult(table, seatId);
    return { type: 'round-ended', result: table.result };
  }

  // Recompute Ceki eligibility for the discarding player on their resting hand.
  const eligible = refreshCekiEligibility(seat, { revoke: true });

  advanceTurn(table);

  // If the draw pile is exhausted, the next player has nothing to draw, so
  // the round ends here and scores are tallied (scenario 3: deck habis).
  if (table.deck.count() === 0) {
    return endDeckEmpty(table);
  }

  return {
    type: 'card-discarded',
    card,
    discardPileCount: table.discardPile.length,
    cekiEligible: eligible,
    nextSeatId: table.turn,
  };
}

function announceCeki(table, seatId) {
  assertPlaying(table);
  const seat = table.seats[seatId];
  if (!seat.cekiEligible) {
    throw new GameError('You are not eligible to announce Ceki yet');
  }
  seat.cekiAnnounced = true;
  return { type: 'ceki-announced', seatId };
}

// --- Closing the round ---------------------------------------------------

// Tutupan close: after drawing, the player picks one card to discard; if the
// remaining cards form a perfect meld partition, the round closes and the
// discarded card is the tutupan (high tariff).
function closeWithLeftover(table, seatId, cardId) {
  assertPlaying(table);
  if (!isPlayersTurn(table, seatId)) throw new GameError('Not your turn');
  const seat = table.seats[seatId];
  if (!seat.hasDrawnThisTurn) throw new GameError('You must draw before closing');
  if (!seat.cekiAnnounced) throw new GameError('You have not announced Ceki');

  const idx = seat.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new GameError('Card not in hand');
  const leftover = seat.hand[idx];
  // A joker normally can't be discarded, but it may be set aside as the
  // tutupan when closing (the round ends, so it never re-enters play).

  const rest = seat.hand.slice(0, idx).concat(seat.hand.slice(idx + 1));
  const melds = findPerfectPartition(rest);
  if (!melds) throw new GameError('Membuang kartu ini tidak menutup tanganmu');

  table.discardPile.push(leftover);
  seat.hand = rest;
  const score =
    meldsNormalValue(seat.tableMelds) + meldsNormalValue(melds) + cardValue(leftover, 'high');

  table.roundOver = true;
  table.endReason = 'closed-tutupan';
  table.result = buildRoundEndResult(table, seatId, score, {
    method: 'tutupan',
    tutupanCard: leftover,
    tableMelds: seat.tableMelds,
    melds,
  });
  return { type: 'round-ended', result: table.result };
}

// source: 'discard' only (ceburan -- claiming the immediately preceding
// player's top-of-discard card, on your own turn).
//
// A 'deck' source used to exist: a blind draw-and-try-close that ended the
// round automatically if the drawn card happened to complete the hand. It was
// removed deliberately -- closing should always be a decision the player
// makes with the card in hand, drawing normally and then picking which card
// to set aside as the tutupan (see closeWithLeftover).
//
// cardId: the player's chosen tutupan (leftover) card, when more than one
// valid choice exists. Falls back to auto-picking (findClosablePartition's own
// preference order) if omitted.
function closeCard(table, seatId, source, cardId) {
  assertPlaying(table);
  const seat = table.seats[seatId];
  if (!seat.cekiAnnounced) throw new GameError('You have not announced Ceki');

  if (source === 'discard') {
    // Kejebur only reaches the immediately-preceding player's discard: that
    // card is the top of the pile exactly during your own turn, so a ceburan
    // is only allowed on your turn (no jumping ahead of the player between
    // you and the discarder).
    if (!isPlayersTurn(table, seatId)) throw new GameError('Ceburan hanya boleh saat giliranmu');
    // Ceburan is an alternative to drawing this turn (you take the previous
    // player's discard instead of drawing), not a follow-up action after
    // you've already drawn -- once hasDrawnThisTurn is true, the only closing
    // path left is tutupan (discarding your leftover normally).
    if (seat.hasDrawnThisTurn) {
      throw new GameError('Kamu sudah menarik kartu giliran ini — ceburan hanya sebelum menarik');
    }
    if (table.discardPile.length === 0) throw new GameError('Discard pile is empty');
    const neededCard = topDiscard(table);
    const trialHand = [...seat.hand, neededCard];

    // A ceburan is only valid if the taken card is actually USED in a meld
    // (not just picked up and set aside again). Prefer closing with a
    // leftover (tutupan, high tariff) whose leftover is some OTHER card, so
    // the taken card is folded into a meld at the normal tariff.
    let closable;
    if (cardId) {
      // Player chose a specific tutupan card (there may be multiple valid
      // choices) -- validate that exact card rather than auto-picking.
      const idx = trialHand.findIndex((c) => c.id === cardId);
      if (idx === -1) throw new GameError('Kartu tutupan tidak valid');
      if (trialHand[idx].id === neededCard.id) {
        throw new GameError('Kartu yang diambil dari buangan tidak bisa jadi tutupannya sendiri');
      }
      const rest = trialHand.slice(0, idx).concat(trialHand.slice(idx + 1));
      const melds = findPerfectPartition(rest);
      closable = melds ? { leftover: trialHand[idx], melds } : null;
    } else {
      closable = findClosablePartition(trialHand, neededCard.id);
    }
    if (closable) {
      table.discardPile.pop();
      seat.hand = closable.melds.flatMap((m) => m.cards);
      const score =
        meldsNormalValue(seat.tableMelds) +
        meldsNormalValue(closable.melds) +
        cardValue(closable.leftover, 'high');
      table.roundOver = true;
      table.endReason = 'closed-ceburan';
      table.result = buildRoundEndResult(table, seatId, score, {
        method: 'ceburan',
        ceburanCard: neededCard,
        tutupanCard: closable.leftover,
        tableMelds: seat.tableMelds,
        melds: closable.melds,
      });
      return { type: 'round-ended', result: table.result };
    }

    // A ceburan must leave exactly one card to set aside as the tutupan.
    if (findPerfectPartition(trialHand)) {
      throw new GameError('Ceburan harus menyisakan 1 kartu tutupan — tutup lewat deck saja');
    }
    throw new GameError('Kartu itu tidak bisa menutup kartumu');
  }

  throw new GameError('Invalid close source');
}


// --- Scoring ---------------------------------------------------------------

// Scores a player's current loose hand (not counting table melds) using the
// best achievable meld coverage: melded cards score positive, leftover cards
// score negative, both at the normal tariff.
function scoreLooseHand(hand) {
  const { melds, meldedCards, unmeldedCards } = bestMeldedSubset(hand, (card, meld) => {
    if (card.isJoker) {
      const assign = meld.jokerAssignments.find((j) => j.jokerId === card.id);
      return cardValue(card, 'normal', assign.rank);
    }
    return cardValue(card, 'normal');
  });
  const positive = meldsNormalValue(melds);
  const negative = unmeldedCards.reduce((sum, c) => sum + cardValue(c, 'normal'), 0);
  return { melds, meldedCards, unmeldedCards, positive, negative };
}

// Full score for a non-closing player: table melds (already banked) plus
// whatever their remaining loose hand nets out to.
function scoreRestingSeat(table, id) {
  const seat = table.seats[id];
  const tableValue = meldsNormalValue(seat.tableMelds);
  const loose = scoreLooseHand(seat.hand);
  const score = tableValue + loose.positive - loose.negative;
  const detail = {
    tableMelds: seat.tableMelds,
    melds: loose.melds,
    meldedCards: loose.meldedCards,
    unmeldedCards: loose.unmeldedCards,
  };
  return { score, detail };
}

// A joker discarded mid-round is removed from play instantly (see
// discardCard), so it never shows up in anyone's hand or table melds by the
// time scoring happens -- its -100 penalty has to be applied separately here,
// against whichever seat discarded it, at every round-end path.
function applyJokerDiscardPenalties(table, scores) {
  for (const { seatId } of table.removedJokers || []) {
    scores[seatId] = (scores[seatId] || 0) - JOKER_PENALTY;
  }
}

function endDeckEmpty(table) {
  table.roundOver = true;
  table.endReason = 'deck-empty';
  const scores = {};
  const details = {};
  for (const seat of activeSeats(table)) {
    const { score, detail } = scoreRestingSeat(table, seat.id);
    scores[seat.id] = score;
    details[seat.id] = detail;
  }
  applyJokerDiscardPenalties(table, scores);
  table.result = { reason: 'deck-empty', scores, details };
  return { type: 'round-ended', result: table.result };
}

function buildRoundEndResult(table, closerId, closerScore, closerDetail) {
  const scores = { [closerId]: closerScore };
  const details = { [closerId]: closerDetail };
  for (const seat of activeSeats(table)) {
    if (seat.id === closerId) continue;
    const { score, detail } = scoreRestingSeat(table, seat.id);
    scores[seat.id] = score;
    details[seat.id] = detail;
  }

  // Kejebur penalty: on a ceburan close, the player who discarded the claimed
  // card pays the closer's high tutupan value, added on top of their own hand
  // score. The closer's score is unchanged (they already banked the tutupan).
  if (closerDetail.method === 'ceburan' && closerDetail.tutupanCard && closerDetail.ceburanCard) {
    const victimId = table.discardBy[closerDetail.ceburanCard.id];
    if (victimId !== undefined && victimId !== closerId && scores[victimId] !== undefined) {
      const penalty = cardValue(closerDetail.tutupanCard, 'high');
      scores[victimId] -= penalty;
      // Carry the claimed card + who claimed it into the victim's own detail
      // too, so the UI can show them *what* got them kejebur, not just the
      // point penalty.
      details[victimId] = {
        ...details[victimId],
        kejeburPenalty: penalty,
        kejeburCard: closerDetail.ceburanCard,
        kejeburBy: closerId,
      };
    }
  }

  applyJokerDiscardPenalties(table, scores);

  return {
    reason: closerDetail.method === 'tutupan' ? 'closed-tutupan' : 'closed-ceburan',
    closerId,
    scores,
    details,
  };
}

function buildEmptyHandCloseResult(table, closerId) {
  const closerSeat = table.seats[closerId];
  const scores = { [closerId]: meldsNormalValue(closerSeat.tableMelds) };
  const details = {
    [closerId]: {
      method: 'meja',
      tableMelds: closerSeat.tableMelds,
      melds: [],
      meldedCards: [],
      unmeldedCards: [],
    },
  };
  for (const seat of activeSeats(table)) {
    if (seat.id === closerId) continue;
    const { score, detail } = scoreRestingSeat(table, seat.id);
    scores[seat.id] = score;
    details[seat.id] = detail;
  }
  applyJokerDiscardPenalties(table, scores);
  return { reason: 'closed-meja', closerId, scores, details };
}

function advanceTurn(table) {
  setTurn(table, nextSeatId(table, table.turn));
}

function setTurn(table, seatId) {
  table.turn = seatId;
  for (const seat of activeSeats(table)) {
    seat.turn = seat.id === seatId;
  }
}

// Call BEFORE vacating a seat mid-round, and pass the result to setTurn once
// the seat is gone. A seat that leaves while holding the turn would otherwise
// strand table.turn on a now-empty seat: isPlayersTurn() can never match it
// again, so every player's action fails "Not your turn" and the round can't
// be restarted either (its status is still 'playing'). Returns null when the
// leaving seat wasn't the one on turn, or when nobody else is left to hand
// the turn to.
function turnAfterVacating(table, vacatingSeatId) {
  if (table.roundOver || table.turn !== vacatingSeatId) return null;
  const next = nextSeatId(table, vacatingSeatId);
  return next === vacatingSeatId ? null : next;
}

// Applies a finished round's result to each seat's cumulative score, the
// "salip" (overtake) house rule, and checks for a final game winner against
// table.targetScore. Call once after a round ends (table.roundOver === true).
//
// House rule (user-confirmed, differs from the reference implementation): a
// player who is genuinely overtaken has their score reset to 0, subject to
// two guards.
//
// 1. They must be sitting high both BEFORE and AFTER the round -- above
//    SALIP_THRESHOLD at each end. Checking only the prior score burned
//    players who had already collapsed during the round (150 down to 40
//    still reset), which reads as unfair when the number on screen is well
//    under the threshold. Requiring both ends also preserves the original
//    intent: no trivial resets early on while scores are still small.
//    A negative score can therefore never be reset either -- zeroing it
//    would hand the "punished" player points back.
//
// 2. The overtake must be strict. Drawing level is not passing someone, so
//    a tie leaves both scores standing.
function applyRoundResultToScores(table) {
  const result = table.result;
  if (!result || !result.scores) return;

  const seats = activeSeats(table);
  const priorScores = {};
  for (const seat of seats) priorScores[seat.id] = seat.cumulativeScore;

  const rawScores = {};
  for (const seat of seats) {
    const delta = result.scores[seat.id] || 0;
    rawScores[seat.id] = priorScores[seat.id] + delta;
  }

  const finalScores = { ...rawScores };
  for (const a of seats) {
    for (const b of seats) {
      if (a.id === b.id) continue;
      const priorA = priorScores[a.id];
      const priorB = priorScores[b.id];
      // Strictly greater: drawing level is not an overtake, so a tie leaves
      // both scores standing.
      const overtook = priorA < priorB && rawScores[a.id] > rawScores[b.id];
      const sittingHigh =
        priorB > SALIP_THRESHOLD && rawScores[b.id] > SALIP_THRESHOLD;
      if (overtook && sittingHigh) {
        finalScores[b.id] = 0;
      }
    }
  }

  for (const seat of seats) {
    seat.cumulativeScore = finalScores[seat.id];
  }

  table.history.push({
    round: table.round,
    reason: result.reason,
    closerId: result.closerId || null,
    deltas: Object.fromEntries(seats.map((s) => [s.id, result.scores[s.id] || 0])),
    cumulative: Object.fromEntries(seats.map((s) => [s.id, s.cumulativeScore])),
  });

  const target = table.targetScore;
  const winner = seats
    .filter((s) => s.cumulativeScore >= target)
    .sort((a, b) => b.cumulativeScore - a.cumulativeScore)[0];

  if (winner) {
    table.gameOver = true;
    table.winnerId = winner.id;
  } else {
    table.gameOver = false;
    table.winnerId = null;
  }
}

// The round starts with the seat that currently has the highest cumulative
// score. If there's a tie for the top (including the first round where
// everyone is at 0), a random one of the tied leaders starts.
function pickStartingSeat(table) {
  const seats = activeSeats(table);
  const maxScore = Math.max(...seats.map((s) => s.cumulativeScore));
  const leaders = seats.filter((s) => s.cumulativeScore === maxScore);
  return leaders[Math.floor(Math.random() * leaders.length)].id;
}

// Per-viewer client state: only the viewer's own hand is sent in full,
// opponents only expose a hand count. Table melds are public.
function toClientState(table, viewerSeatId) {
  const seats = activeSeats(table);
  return {
    roundOver: table.roundOver,
    endReason: table.endReason,
    result: table.result,
    turnSeatId: table.roundOver ? null : table.turn,
    hasDrawnThisTurn: table.seats[viewerSeatId]
      ? table.seats[viewerSeatId].hasDrawnThisTurn
      : false,
    drawPileCount: table.deck ? table.deck.count() : 0,
    discardPile: table.discardPile,
    removedJokers: (table.removedJokers || []).map((e) => ({
      card: e.card,
      seatId: e.seatId,
    })),
    ceki: Object.fromEntries(seats.map((s) => [s.id, s.cekiAnnounced])),
    cekiEligible: { [viewerSeatId]: (table.seats[viewerSeatId] || {}).cekiEligible || false },
    discardMeldUnlocked: {
      [viewerSeatId]: (table.seats[viewerSeatId] || {}).discardMeldUnlocked || false,
    },
    myHand: table.seats[viewerSeatId] ? table.seats[viewerSeatId].hand : [],
    handCounts: Object.fromEntries(seats.map((s) => [s.id, s.hand.length])),
    tableMelds: Object.fromEntries(seats.map((s) => [s.id, s.tableMelds])),
    cumulativeScores: Object.fromEntries(seats.map((s) => [s.id, s.cumulativeScore])),
    round: table.round,
    gameOver: !!table.gameOver,
    winnerId: table.winnerId || null,
  };
}

module.exports = {
  activeSeats,
  nextSeatId,
  setTurn,
  turnAfterVacating,
  startRound,
  drawFromDeck,
  meldFromDiscard,
  discardCard,
  announceCeki,
  closeWithLeftover,
  closeCard,
  applyRoundResultToScores,
  pickStartingSeat,
  toClientState,
};
