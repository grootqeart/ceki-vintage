// Sound registry.
//
// Each key maps to a list of sources for the SAME sound in different
// formats. The engine (hooks/useSounds.js) picks the first one the browser
// reports it can actually decode, and falls back to a synthesised effect if
// none of them are playable -- so a missing codec makes the sound cruder,
// never silent.
//
// Why that matters here: these are .ogg, which Chrome/Firefox/Android play
// fine but Safari has long refused. Dropping the .wav (or .mp3) copies of the
// same files into this folder and adding them to the arrays below is what
// gets real card sounds onto iPhones -- no code change needed:
//
//   import cardSlideWav from './card-slide-1.wav';
//   cardDraw: [cardSlideOgg, cardSlideWav],
//
// Order matters only for size: put the smaller format first, since the first
// playable one wins.
//
// Audio: Kenney (kenney.nl), CC0.

import cardSlideOgg from './card-slide-1.ogg';
import cardShoveOgg from './card-shove-1.ogg';
import cardFanOgg from './card-fan-1.ogg';
import cardShuffleOgg from './card-shuffle.ogg';

const FILES = {
  // A single card leaving the deck.
  cardDraw: [cardSlideOgg],
  // A card being pushed onto the pile.
  cardDiscard: [cardShoveOgg],
  // Several cards swept up off the discard pile at once.
  pileTake: [cardFanOgg],
  // Start of a round.
  deal: [cardShuffleOgg],
  // `turn` and `error` are deliberately left synthesised: they are UI cues,
  // not physical card noises, and tones are both exact and free.
};

export default FILES;
