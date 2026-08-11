import React from 'react';
import table from '../../assets/game/table.png';

// The felt table art is a wide oval (2194x1090, ~2:1) designed for a
// landscape desktop table -- squeezed into a narrow portrait column it'd
// render as a thin sliver, not read as a table anymore. Rotating it 90deg
// turns the long axis vertical instead, which fits a tall portrait screen
// naturally (the art is symmetric enough -- felt + wood rail + outer trim,
// no directional lighting -- that a rotation doesn't look "wrong").
//
// The wrapper's `width` and the image's `height` deliberately share the
// exact same CSS expression: the wrapper needs aspect-ratio (1090/2194) to
// size its own height correctly, and the pre-rotation image needs its own
// height set to match the wrapper's WIDTH (so that after the 90deg turn its
// long dimension becomes the wrapper's height) -- CSS can't reference "my
// parent's width" from a height property directly, so keeping both
// expressions textually identical is what keeps them numerically in sync
// at any viewport size, without JS measurement.
const SIZE_EXPR = 'min(88vw, 320px)';
const IMG_W = 2194;
const IMG_H = 1090;

const RotatedFeltTable = ({ children }) => (
  <div
    style={{
      position: 'relative',
      width: SIZE_EXPR,
      aspectRatio: `${IMG_H} / ${IMG_W}`,
      margin: '0 auto',
      // Deliberately NOT overflow:hidden -- the seat labels hang off the
      // sides of the table on purpose, and clipping here swallowed them.
      // The rotated image is sized to fill this box exactly, so nothing
      // else spills out.
      overflow: 'visible',
    }}
  >
    <img
      src={table}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        height: SIZE_EXPR,
        width: 'auto',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
    <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
  </div>
);

export default RotatedFeltTable;
