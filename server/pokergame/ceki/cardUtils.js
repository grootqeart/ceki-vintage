const lodash = require('lodash');
const {
  SUITS,
  RANKS,
  RANK_ORDER,
  JOKER_COUNT,
  NORMAL_VALUES,
  HIGH_VALUES,
  JOKER_PENALTY,
} = require('./constants');

// Card shape: { id, suit, rank, isJoker }
// id is a stable unique string, e.g. "sA", "c10", "joker1".

function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: `${suit}${rank}`, suit, rank, isJoker: false });
    }
  }
  for (let i = 1; i <= JOKER_COUNT; i++) {
    cards.push({ id: `joker${i}`, suit: 'joker', rank: null, isJoker: true });
  }
  return cards;
}

function shuffle(deck) {
  let cards = deck.slice();
  for (let i = 0; i <= 7; i++) {
    cards = lodash.shuffle(cards);
  }
  return cards;
}

// Value of a normal (non-joker) card at a given tariff ('normal' | 'high').
function baseCardValue(card, tariff) {
  const table = tariff === 'high' ? HIGH_VALUES : NORMAL_VALUES;
  const order = RANK_ORDER[card.rank];
  if (order === 1) return table.ace;
  if (order >= 11) return table.face;
  return table.low;
}

// Value of a card for scoring purposes. If the card is a joker,
// `impersonatedRank` (the rank it represents within its meld) must be
// supplied to compute the "mengikuti nilai kartu yang digantikan" rule for
// normal tariff. For the high tariff, a joker is always worth
// HIGH_VALUES.joker regardless of what it represents.
//
// A joker with no `impersonatedRank` means it never made it into a meld --
// it's either still sitting idle/unmelded in a resting hand at round-end, or
// this is the (rare) 'normal' scoring path for a joker that isn't part of
// any meld. Per house rule that's a flat JOKER_PENALTY, same magnitude as
// the tutupan bonus but negative (the caller subtracts this from the score).
function cardValue(card, tariff, impersonatedRank) {
  if (card.isJoker) {
    if (tariff === 'high') return HIGH_VALUES.joker;
    if (impersonatedRank == null) return JOKER_PENALTY;
    const fakeCard = { rank: impersonatedRank, isJoker: false };
    return baseCardValue(fakeCard, 'normal');
  }
  return baseCardValue(card, tariff);
}

module.exports = { createDeck, shuffle, cardValue, baseCardValue };
