// KEEP IN SYNC WITH server/pokergame/ceki/constants.js
// Ceki rule constants. Card rank strings match the existing Vintage Poker
// convention ('A','2'..'10','J','Q','K') rather than the numeric 1-13 scheme
// used by the Ceki reference implementation, to stay compatible with the
// existing Deck.js/PokerCard.js card-key format (`${suit}${rank}`).

export const SUITS = ['s', 'h', 'd', 'c'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Numeric ordering used internally by run/set validation (A=1 .. K=13).
export const RANK_ORDER = {
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
export const ORDER_TO_RANK = Object.fromEntries(
  Object.entries(RANK_ORDER).map(([rank, order]) => [order, rank]),
);

export const JOKER_COUNT = 3;
export const HAND_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const MAX_DISCARD_TAKE = 7;
export const ROOM_CODE_LENGTH = 6;
export const VALID_TARGET_SCORES = [500, 1000];

// Tarif normal (in-hand / end-of-deck scoring)
export const NORMAL_VALUES = {
  low: 5, // 2-10
  face: 10, // J Q K
  ace: 15,
};

// Tarif tinggi (tutupan & ceburan)
export const HIGH_VALUES = {
  low: 15, // 2-10
  face: 25, // J Q K
  ace: 50,
  joker: 100,
};

// Custom house rule (user-confirmed): the "salip" (overtake) rule only resets
// an overtaken player's score to 0 if their score was already above this
// threshold before being overtaken.
export const SALIP_THRESHOLD = 100;

// Quick-reaction stickers: fixed set, ids 1..STICKER_COUNT.
export const STICKER_COUNT = 8;

