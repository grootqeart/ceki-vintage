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

import sticker1 from './sticker1.mp3';
import sticker2 from './sticker2.mp3';
import sticker3 from './sticker3.mp3';
import sticker4 from './sticker4.mp3';
import sticker5 from './sticker5.mp3';
import sticker6 from './sticker6.mp3';
import sticker7 from './sticker7.mp3';
import sticker8 from './sticker8.mp3';

// Sticker reactions look up `sticker<id>` first and fall back to the shared
// `sticker` key, so you can give one sticker its own noise without supplying
// eight. Until a file appears for either, a synthesised blip is used, pitched
// differently per sticker id so the eight already sound distinct.
//
//   import stickerLaugh from './sticker-2.ogg';
//   sticker2: [stickerLaugh],          // just this one
//   sticker: [stickerGenericOgg],      // every sticker without its own

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

  // Sticker reactions -- ids match client/src/assets/stickers/stickers.js.
  // mp3 rather than ogg, so these play on iOS too.
  sticker1: [sticker1], // Asik!
  sticker2: [sticker2], // Ngakak
  sticker3: [sticker3], // Nangis
  sticker4: [sticker4], // Mantap
  sticker5: [sticker5], // Oke
  sticker6: [sticker6], // Mati aku
  sticker7: [sticker7], // Mikir
  sticker8: [sticker8], // GG
};

export default FILES;
