import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import STICKERS from '../../assets/stickers/stickers';

// Floating toggle button, draggable anywhere on screen (position persists in
// localStorage across reloads, same pattern as ScoreBoard.js) so it doesn't
// permanently sit on top of table content on smaller screens. Tapping (not
// dragging) it opens a small grid of the fixed sticker set -- tapping a
// sticker sends it and closes the panel.
const POS_KEY = 'ceki:stickerPicker:pos';
const BUTTON_SIZE = 44; // px
const DRAG_THRESHOLD = 6;

function loadStoredPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
  } catch (e) {
    /* ignore */
  }
  return null;
}

function defaultPos() {
  // Top-right, mirroring the ScoreBoard widget's collapsed trophy button up
  // at top-left -- both float along the top edge by default, out of the way
  // of the table/hand below. Still draggable anywhere afterwards.
  return {
    x: window.innerWidth - BUTTON_SIZE - 12,
    y: 72,
  };
}

function clampPos(p) {
  const maxX = Math.max(0, window.innerWidth - BUTTON_SIZE);
  const maxY = Math.max(0, window.innerHeight - BUTTON_SIZE);
  return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
}

const StyledWrapper = styled.div`
  position: fixed;
  z-index: 90;
`;

const StyledToggle = styled.button`
  width: ${BUTTON_SIZE}px;
  height: ${BUTTON_SIZE}px;
  border-radius: 999px;
  border: none;
  background-color: rgba(20, 40, 35, 0.85);
  color: white;
  font-size: 1.2rem;
  cursor: grab;
  touch-action: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
`;

const StyledPanel = styled.div`
  position: absolute;
  top: ${BUTTON_SIZE + 12}px;
  right: 0;
  background-color: rgba(20, 40, 35, 0.92);
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  padding: 0.75rem;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  width: min(88vw, 320px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
`;

const StyledStickerButton = styled.button`
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.35rem;
  cursor: pointer;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    border-radius: 7px;
  }
`;

const StickerPicker = ({ onSend }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    setPos(clampPos(loadStoredPos() || defaultPos()));
  }, []);

  function persistPos(p) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch (e) {
      /* ignore */
    }
  }

  function handlePointerDown(e) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) setPos(clampPos({ x: d.origX + dx, y: d.origY + dy }));
  }

  function handlePointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && d.moved) {
      setPos((p) => {
        persistPos(p);
        return p;
      });
    } else {
      setOpen((o) => !o);
    }
  }

  if (!pos) return null;

  return (
    <StyledWrapper style={{ left: pos.x, top: pos.y }}>
      {open && (
        <StyledPanel>
          {Object.entries(STICKERS).map(([id, sticker]) => (
            <StyledStickerButton
              key={id}
              type="button"
              title={sticker.label}
              onClick={() => {
                onSend(Number(id));
                setOpen(false);
              }}
            >
              <img src={sticker.src} alt={sticker.label} />
            </StyledStickerButton>
          ))}
        </StyledPanel>
      )}
      <StyledToggle
        type="button"
        title="Kirim sticker (tahan & geser untuk pindah)"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        <span role="img" aria-label="sticker">
          {'\u{1F3AD}'}
        </span>
      </StyledToggle>
    </StyledWrapper>
  );
};

export default StickerPicker;
