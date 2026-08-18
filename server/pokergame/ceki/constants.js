// Ceki rule constants. Card rank strings match the existing Vintage Poker
// convention ('A','2'..'10','J','Q','K') rather than the numeric 1-13 scheme
// used by the Ceki reference implementation, to stay compatible with the
// existing Deck.js/PokerCard.js card-key format (`${suit}${rank}`).

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Numeric ordering used internally by run/set validation (A=1 .. K=13).
const RANK_ORDER = {
  A: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
};
const ORDER_TO_RANK = Object.fromEntries(
  Object.entries(RANK_ORDER).map(([rank, order]) => [order, rank]),
);

const JOKER_COUNT = 3;
const HAND_SIZE = 7;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const MAX_DISCARD_TAKE = 7;
// Taking from the discard pile has to be supported by at least this many
// cards from the player's OWN hand -- cards swept up alongside the needed one
// do not count towards it.
const MIN_SUPPORT_FROM_HAND = 2;
const ROOM_CODE_LENGTH = 6;
const ROOM_NAME_MAX_LENGTH = 30;
const VALID_TARGET_SCORES = [500, 1000];

// Tarif normal (in-hand / end-of-deck scoring)
const NORMAL_VALUES = {
  low: 5, // 2-10
  face: 10, // J Q K
  ace: 15,
};

// Tarif tinggi (tutupan & ceburan)
const HIGH_VALUES = {
  low: 15, // 2-10
  face: 25, // J Q K
  ace: 50,
  joker: 100,
};

// Custom house rule (user-confirmed): the "salip" (overtake) rule only resets
// an overtaken player's score to 0 if their score was already above this
// threshold before being overtaken.
const SALIP_THRESHOLD = 100;

// Custom house rule (user-confirmed): a joker that never ends up melded --
// either discarded (removed from play instantly, can't be taken back) or
// still idle/unmelded in hand when the round ends -- costs the holder this
// many points at round-end scoring. Same magnitude as HIGH_VALUES.joker (the
// bonus for using a joker as a tutupan), just negative.
const JOKER_PENALTY = 100;

// Quick-reaction stickers: fixed set, ids 1..STICKER_COUNT. Actual artwork
// lives client-side only (client/src/assets/stickers/); the server just
// validates the id is in range and relays who sent what.
const STICKER_COUNT = 8;

module.exports = {
  SUITS,
  RANKS,
  RANK_ORDER,
  ORDER_TO_RANK,
  JOKER_COUNT,
  HAND_SIZE,
  MIN_PLAYERS,
  MAX_PLAYERS,
  MAX_DISCARD_TAKE,
  MIN_SUPPORT_FROM_HAND,
  ROOM_CODE_LENGTH,
  ROOM_NAME_MAX_LENGTH,
  VALID_TARGET_SCORES,
  NORMAL_VALUES,
  HIGH_VALUES,
  SALIP_THRESHOLD,
  JOKER_PENALTY,
  STICKER_COUNT,
};
