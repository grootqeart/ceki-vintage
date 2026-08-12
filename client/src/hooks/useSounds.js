import { useCallback, useEffect, useRef, useState } from 'react';
import FILES from '../assets/sounds/sounds';

const MUTE_KEY = 'ceki:sound:muted';
const POOL_SIZE = 3;

function loadMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

// --- Synthesised effects ---------------------------------------------------
//
// Short one-shots built from an oscillator or a burst of noise. Card noises
// are the approximate ones (a real card is a broadband transient); the UI
// cues -- your turn, rejected action -- are pure tones and sound exactly as
// intended.

function noiseBuffer(ctx, seconds) {
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Decays across the burst so it reads as a flick rather than a hiss.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  return buffer;
}

function playNoise(ctx, { duration, freq, q, gain, delay = 0 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;

  const amp = ctx.createGain();
  const t = ctx.currentTime + delay;
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  src.connect(filter).connect(amp).connect(ctx.destination);
  src.start(t);
  src.stop(t + duration);
}

function playTone(ctx, { freq, duration, gain, type = 'sine', delay = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  const amp = ctx.createGain();
  const t = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(freq, t);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

// Slight random detune/pitch per call so a repeated action doesn't turn into
// a metronome.
const wobble = (spread) => 1 + (Math.random() * 2 - 1) * spread;

const SYNTH = {
  cardDraw: (ctx) =>
    playNoise(ctx, { duration: 0.13, freq: 1900 * wobble(0.12), q: 0.8, gain: 0.16 }),
  cardDiscard: (ctx) => {
    playNoise(ctx, { duration: 0.1, freq: 1500 * wobble(0.12), q: 0.7, gain: 0.18 });
    playNoise(ctx, { duration: 0.07, freq: 320, q: 1.2, gain: 0.1, delay: 0.05 });
  },
  pileTake: (ctx) => {
    // Several cards sweeping up at once.
    for (let i = 0; i < 3; i++) {
      playNoise(ctx, {
        duration: 0.1,
        freq: 1700 * wobble(0.18),
        q: 0.8,
        gain: 0.11,
        delay: i * 0.045,
      });
    }
  },
  deal: (ctx) => {
    for (let i = 0; i < 5; i++) {
      playNoise(ctx, {
        duration: 0.09,
        freq: 1800 * wobble(0.2),
        q: 0.9,
        gain: 0.1,
        delay: i * 0.08,
      });
    }
  },
  turn: (ctx) => {
    playTone(ctx, { freq: 660, duration: 0.16, gain: 0.11 });
    playTone(ctx, { freq: 990, duration: 0.22, gain: 0.1, delay: 0.11 });
  },
  error: (ctx) => {
    playTone(ctx, { freq: 200, duration: 0.16, gain: 0.11, type: 'square' });
  },
  // Receives the key it was looked up under so the eight stickers can each
  // get their own pitch without needing eight entries here. A rising pair of
  // notes reads as a reaction rather than as another card noise.
  sticker: (ctx, key) => {
    const id = parseInt(String(key).replace('sticker', ''), 10);
    const step = Number.isFinite(id) ? id : 1;
    // Walks a pentatonic scale, so any two stickers still sound pleasant
    // back to back.
    const semitones = [0, 3, 5, 7, 10, 12, 15, 17][(step - 1) % 8];
    const base = 523.25 * Math.pow(2, semitones / 12);
    playTone(ctx, { freq: base, duration: 0.12, gain: 0.1, type: 'triangle' });
    playTone(ctx, { freq: base * 1.5, duration: 0.16, gain: 0.09, type: 'triangle', delay: 0.08 });
  },
};

// --- Engine ----------------------------------------------------------------

let sharedCtx = null;
function getCtx() {
  if (sharedCtx) return sharedCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  sharedCtx = new Ctor();
  return sharedCtx;
}

const MIME_BY_EXT = {
  ogg: 'audio/ogg; codecs="vorbis"',
  oga: 'audio/ogg; codecs="vorbis"',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
};

// Resolved once per key: which of the registered sources this browser can
// actually decode, or null if none of them. canPlayType answers '' for
// unsupported, 'maybe'/'probably' otherwise -- there is no stronger signal
// available without downloading and trying.
const resolvedSrc = {};
function pickSource(key) {
  if (key in resolvedSrc) return resolvedSrc[key];

  const sources = FILES[key];
  const list = Array.isArray(sources) ? sources : sources ? [sources] : [];
  let chosen = null;

  if (list.length) {
    const probe = document.createElement('audio');
    for (const src of list) {
      const ext = String(src).split('?')[0].split('.').pop().toLowerCase();
      const mime = MIME_BY_EXT[ext];
      // Unknown extension: let the browser try rather than rule it out.
      if (!mime || probe.canPlayType(mime)) {
        chosen = src;
        break;
      }
    }
  }

  resolvedSrc[key] = chosen;
  return chosen;
}

const FADE_MS = 300;

// Ramps the volume down before pausing. Stopping an element outright mid-clip
// is audible as a click.
function fadeOutAndStop(el) {
  const steps = 10;
  let n = 0;
  const from = el.volume;
  if (el.__fadeTimer) clearInterval(el.__fadeTimer);
  el.__fadeTimer = setInterval(() => {
    n += 1;
    el.volume = Math.max(0, from * (1 - n / steps));
    if (n >= steps) {
      clearInterval(el.__fadeTimer);
      el.__fadeTimer = null;
      el.pause();
      el.currentTime = 0;
      el.volume = 1;
    }
  }, FADE_MS / steps);
}

// One Audio element can't overlap itself -- replaying it restarts the same
// playback and cuts the previous one off. Each registered file therefore gets
// a small pool that is cycled through.
const pools = {};
function getFromPool(key, src) {
  if (!pools[key]) {
    pools[key] = { items: Array.from({ length: POOL_SIZE }, () => new Audio(src)), next: 0 };
    pools[key].items.forEach((a) => {
      a.preload = 'auto';
    });
  }
  const pool = pools[key];
  const el = pool.items[pool.next];
  pool.next = (pool.next + 1) % pool.items.length;
  return el;
}

export default function useSounds() {
  const [muted, setMuted] = useState(loadMuted);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Browsers refuse to start audio until the user has interacted with the
  // page, and iOS keeps the context suspended until then too. Unlock on the
  // first touch/click anywhere, once.
  useEffect(() => {
    const unlock = () => {
      const ctx = getCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // `keys` may be a single key or a list to try in order -- used so a sticker
  // can look for its own sound first and fall back to a shared one, e.g.
  // play(['sticker3', 'sticker']).
  //
  // `maxMs` caps how long the clip is allowed to run, fading out rather than
  // cutting dead so the stop isn't a click. Used for sticker reactions, where
  // a clip longer than the bubble would keep playing for a sticker that is no
  // longer on screen.
  const play = useCallback(function playSound(keys, { maxMs } = {}) {
    if (mutedRef.current) return;

    const candidates = Array.isArray(keys) ? keys : [keys];
    const key = candidates.find((k) => pickSource(k)) || candidates[candidates.length - 1];

    const file = pickSource(key);
    if (file) {
      try {
        const el = getFromPool(key, file);
        // The pool reuses elements, so undo whatever the previous play left
        // behind before starting this one.
        if (el.__stopTimer) clearTimeout(el.__stopTimer);
        if (el.__fadeTimer) clearInterval(el.__fadeTimer);
        el.volume = 1;
        if (maxMs) {
          el.__stopTimer = setTimeout(() => fadeOutAndStop(el), maxMs);
        }
        // canPlayType is only ever a guess ('maybe'), so a source can still
        // turn out to be undecodable. Demote the key to synthesis for the
        // rest of the session rather than leaving it permanently silent.
        el.onerror = () => {
          resolvedSrc[key] = null;
          delete pools[key];
        };
        el.currentTime = 0;
        // Ignored rejection: browsers reject play() before the first gesture.
        const p = el.play();
        if (p && p.catch) {
          p.catch(() => {
            if (el.error) {
              resolvedSrc[key] = null;
              delete pools[key];
            }
          });
        }
      } catch (e) {
        /* never let audio break the game */
      }
      return;
    }

    // Same fallback walk for synthesis: sticker3 has no synth of its own, so
    // it lands on the shared `sticker` one, which pitches itself from the key
    // it was asked for.
    const synthKey = candidates.find((k) => SYNTH[k]);
    const synth = synthKey && SYNTH[synthKey];
    if (!synth) return;
    try {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      synth(ctx, candidates[0]);
    } catch (e) {
      /* never let audio break the game */
    }
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch (e) {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { play, muted, toggleMuted };
}
