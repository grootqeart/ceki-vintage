import React from 'react';
import styled, { css } from 'styled-components';
import PokerCard from './PokerCard';
import Text from '../typography/Text';
import { MAX_DISCARD_TAKE } from '../../pokergame/ceki/constants';

// The discard pile is laid out as one continuous rectangular spiral around
// the deck: the first cards form a top row, then turn down the right side,
// across the bottom, up the left, then a wider top row, and so on -- each
// lap's arms grow by one, spiralling outward so the newest discard is always
// on the outermost edge. The deck sits in a fixed hole cell this spiral never
// occupies. Ported from the Ceki reference's TableCenter.js.
const CARD_W = 46;
const CARD_H = 66;
const STEP_X = CARD_W + 6;
const STEP_Y = CARD_H + 14; // extra so rows don't overlap the deck/each other

// Mobile (portrait/vertical) renders the same cards far smaller -- the
// PokerCard sizing below bottoms out at its 40px minWidth on a phone rather
// than the ~64px it reaches on desktop. Stepping by the desktop-sized
// constants there leaves a gap wider than the card itself between
// consecutive discards, so the pile needs its own steps derived from the
// size the cards actually render at.
const CARD_W_V = 40;
const CARD_H_V = 57; // 40px wide at the standard playing-card ~0.7 ratio
const STEP_X_V = CARD_W_V + 4;
const STEP_Y_V = CARD_H_V + 4;

// Card render size per orientation. These must stay in step with the CARD_*
// constants above -- those drive the spiral's spacing, so a card rendered
// larger than its constant overlaps its neighbours and one rendered smaller
// leaves gaps.
const CARD_PROPS = {
  horizontal: { width: '4vw', maxWidth: '48px', minWidth: '34px' },
  vertical: { width: '5.6vw', maxWidth: '64px', minWidth: '40px' },
};
const DECK_COL = 2;
const DECK_ROW = 1;

const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
// Arm lengths are specified as they READ ON SCREEN: 5 long, 3 across, 6
// long, 4 across, 7 long, ... Each turn's corner card sits in both the arm
// it ends and the arm it starts, so it is visible in two runs at once --
// counting cards rather than counting corners is what previously made a
// "5" arm look like a 6. The generator below therefore emits one card fewer
// than the stated length for every arm after the first, letting the
// inherited corner complete the run.
const VISUAL_LONG = 5;
const VISUAL_SHORT = 3;

function spiralCells(count) {
  const cells = [];
  let x = 0;
  let y = 0;
  let k = 0;
  while (cells.length < count) {
    const [dx, dy] = DIRS[k % 4];
    const isLong = k % 2 === 0;
    const visualLen = (isLong ? VISUAL_LONG : VISUAL_SHORT) + Math.floor(k / 2);
    const segLen = k === 0 ? visualLen : visualLen - 1;
    for (let s = 0; s < segLen && cells.length < count; s++) {
      cells.push({ col: x, row: y });
      x += dx;
      y += dy;
    }
    // Back out of the overshoot, then take the first step of the new
    // direction, so the next arm begins one cell PAST the corner rather than
    // landing on it a second time.
    x -= dx;
    y -= dy;
    k++;
    const [nextDx, nextDy] = DIRS[k % 4];
    x += nextDx;
    y += nextDy;
  }
  return cells;
}

const StyledStage = styled.div`
  position: relative;
`;

const StyledCardSlot = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transition: transform 0.2s;
`;

const StyledRing = styled.div`
  border-radius: 6px;

  ${({ ring }) =>
    ring === 'needed' &&
    css`
      outline: 3px solid #34d399;
      outline-offset: 2px;
    `}
  ${({ ring }) =>
    ring === 'top' &&
    css`
      outline: 3px solid gold;
      outline-offset: 2px;
    `}
  ${({ ring }) =>
    ring === 'range' &&
    css`
      outline: 2px dashed rgba(255, 255, 255, 0.6);
      outline-offset: 2px;
    `}
`;

const StyledLabel = styled.span`
  display: inline-block;
  background: rgba(0, 0, 0, 0.4);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.7rem;
  padding: 0.1rem 0.75rem;
  border-radius: 999px;
  margin-bottom: 0.35rem;
`;

const TableCenter = ({
  pile,
  drawPileCount,
  canDrawDeck,
  onDrawDeck,
  canPick,
  pendingCount,
  onPickDepth,
  selectedIds = [],
  onToggleId,
  removedJokerCount = 0,
  vertical = false,
}) => {
  const picking = pendingCount != null;
  const cells = spiralCells(pile.length);
  // The spiral is authored growing wide-first (its long first lap runs along
  // `col`), which reads right on the wide landscape table. On the rotated
  // portrait mobile table that same wide spiral spills sideways past the
  // narrow felt. Feeding `col` into the y axis instead makes the identical
  // spiral grow tall-first, matching the table's own orientation.
  //
  // Note the step sizes stay bound to the SCREEN axis, not to the cell
  // coordinate: whichever coordinate drives x needs the card-width step and
  // whichever drives y needs the (taller) card-height step. Carrying the
  // steps along with the swapped coordinates instead is what made the pile
  // spread too far sideways while stacking too tightly downward.
  const stepX = vertical ? STEP_X_V : STEP_X;
  const stepY = vertical ? STEP_Y_V : STEP_Y;
  const cardW = vertical ? CARD_W_V : CARD_W;
  const cardH = vertical ? CARD_H_V : CARD_H;
  const cardProps = vertical ? CARD_PROPS.vertical : CARD_PROPS.horizontal;
  const positions = cells.map((c) => {
    const ci = c.col - DECK_COL;
    const ri = c.row - DECK_ROW;
    return vertical ? { x: ri * stepX, y: ci * stepY } : { x: ci * stepX, y: ri * stepY };
  });
  const maxAbsX = positions.reduce((m, p) => Math.max(m, Math.abs(p.x)), stepX);
  const maxAbsY = positions.reduce((m, p) => Math.max(m, Math.abs(p.y)), stepY);
  const halfW = maxAbsX + cardW / 2 + 8;
  const halfH = maxAbsY + cardH / 2 + 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <StyledLabel>Buangan ({pile.length})</StyledLabel>
      {removedJokerCount > 0 && (
        <StyledLabel style={{ background: 'rgba(180, 30, 30, 0.6)' }}>
          Joker tersingkir: {removedJokerCount}
        </StyledLabel>
      )}

      <StyledStage style={{ width: halfW * 2, height: halfH * 2 }}>
        {/* The "Sisa: N" label lives in its own slot, separate from the deck
            card's -- keeping it inside the same box as the card image would
            shift the image's centering point upward by half the label's
            height, nudging the deck art visually into the pile row above
            it. */}
        <StyledCardSlot style={{ transform: 'translate(-50%, -50%)', zIndex: 1 }}>
          <PokerCard
            card={{}}
            faceDown
            interactive={canDrawDeck}
            onClick={() => canDrawDeck && onDrawDeck()}
            {...cardProps}
            compact
          />
        </StyledCardSlot>
        <StyledCardSlot style={{ transform: `translate(-50%, ${cardH / 2 + 6}px)`, zIndex: 1 }}>
          <Text fontSize="0.7rem" textAlign="center">
            Sisa: {drawPileCount}
          </Text>
        </StyledCardSlot>

        {pile.map((card, i) => {
          const depthFromTop = pile.length - i;
          const isTop = depthFromTop === 1;
          const isNeeded = picking && depthFromTop === pendingCount;
          const isExtraInRange = picking && depthFromTop < pendingCount;
          const isOutOfRange = picking && depthFromTop > pendingCount;
          const isExtraSelected = isExtraInRange && selectedIds.includes(card.id);
          const withinTakeLimit = depthFromTop <= MAX_DISCARD_TAKE;

          // A card deeper than the current pick isn't part of the take yet,
          // but clicking it re-picks the depth to reach it (equivalent to
          // hitting "Batal" and picking again) -- no need to cancel first.
          const canRepick = isOutOfRange && canPick && withinTakeLimit;
          const clickable = picking ? isExtraInRange || canRepick : canPick && withinTakeLimit;
          const handleClick = picking
            ? isExtraInRange
              ? () => onToggleId(card.id)
              : canRepick
              ? () => onPickDepth(depthFromTop)
              : undefined
            : canPick && withinTakeLimit
            ? () => onPickDepth(depthFromTop)
            : undefined;

          let ring = null;
          if (isNeeded) ring = 'needed';
          else if (isExtraSelected) ring = 'top';
          else if (isExtraInRange) ring = 'range';
          else if (!picking && isTop) ring = 'top';

          const pos = positions[i];

          return (
            <StyledCardSlot
              key={card.id}
              style={{
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                zIndex: isTop ? 1000 : 10 + i,
                opacity: clickable ? 1 : picking ? 0.4 : 0.6,
              }}
            >
              <StyledRing ring={ring}>
                <PokerCard
                  card={card}
                  selected={isExtraSelected}
                  interactive={!!clickable}
                  onClick={handleClick}
                  {...cardProps}
                  compact
                />
              </StyledRing>
              {isNeeded && (
                <Text fontSize="0.6rem" textAlign="center" style={{ color: '#34d399' }}>
                  wajib
                </Text>
              )}
            </StyledCardSlot>
          );
        })}
      </StyledStage>
    </div>
  );
};

export default TableCenter;
