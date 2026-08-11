import sticker1 from './sticker1.gif';
import sticker2 from './sticker2.gif';
import sticker3 from './sticker3.gif';
import sticker4 from './sticker4.gif';
import sticker5 from './sticker5.gif';
import sticker6 from './sticker6.gif';
import sticker7 from './sticker7.gif';
import sticker8 from './sticker8.gif';

// Fixed quick-reaction sticker set (ids 1..8, must match server's
// STICKER_COUNT in server/pokergame/ceki/constants.js). These are
// placeholder art -- replace the sticker*.gif files in this folder with
// real artwork any time; nothing else needs to change since the ids and
// import wiring stay the same.
const STICKERS = {
  1: { src: sticker1, label: 'Asik!' },
  2: { src: sticker2, label: 'Ngakak' },
  3: { src: sticker3, label: 'Nangis' },
  4: { src: sticker4, label: 'Mantap' },
  5: { src: sticker5, label: 'Oke' },
  6: { src: sticker6, label: 'Mati aku' },
  7: { src: sticker7, label: 'Mikir' },
  8: { src: sticker8, label: 'GG' },
};

export default STICKERS;
