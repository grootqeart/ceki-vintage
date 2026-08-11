// KEEP IN SYNC WITH server/pokergame/ceki/cardUtils.js (client copy omits
// createDeck/shuffle -- those are server-only and pull in `lodash`, which
// isn't a client dependency; the client only ever needs cardValue for the
// optimistic sort/highlight hints in Hand.js).
import { RANK_ORDER, NORMAL_VALUES, HIGH_VALUES } from './constants';

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
function cardValue(card, tariff, impersonatedRank) {
  if (card.isJoker) {
    if (tariff === 'high') return HIGH_VALUES.joker;
    if (impersonatedRank == null) return NORMAL_VALUES.low; // fallback, shouldn't normally happen
    const fakeCard = { rank: impersonatedRank, isJoker: false };
    return baseCardValue(fakeCard, 'normal');
  }
  return baseCardValue(card, tariff);
}

export { cardValue, baseCardValue };
