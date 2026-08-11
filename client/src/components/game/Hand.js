import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import PokerCard from './PokerCard';
import { bestMeldedSubset } from '../../pokergame/ceki/combinations';
import { cardValue } from '../../pokergame/ceki/cardUtils';
import { RANK_ORDER } from '../../pokergame/ceki/constants';

const DRAG_THRESHOLD = 8; // px of movement before a press counts as a drag, not a tap
const SUIT_ORDER = { s: 0, h: 1, d: 2, c: 3 };

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledSortButton = styled.button`
  font-size: 0.7rem;
  background: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
`;

const StyledHand = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-end;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 0.75rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
`;

const StyledCardSlot = styled.div`
  touch-action: none;
  cursor: ${({ draggable }) => (draggable ? 'grab' : 'default')};
  flex: 0 0 auto;
  position: relative;

  &:not(:first-child) {
    margin-left: -2.4rem;
  }
`;

function meldCardRank(card, meld) {
  if (!card.isJoker) return card.rank;
  const assign = meld.jokerAssignments.find((j) => j.jokerId === card.id);
  return assign ? assign.rank : null;
}

function meldCardSuit(card, meld) {
  if (!card.isJoker) return card.suit;
  const assign = meld.jokerAssignments.find((j) => j.jokerId === card.id);
  return assign ? assign.suit : null;
}

function normalValue(card, meld) {
  if (card.isJoker) {
    const assign = meld.jokerAssignments.find((j) => j.jokerId === card.id);
    return cardValue(card, 'normal', assign.rank);
  }
  return cardValue(card, 'normal');
}

// Groups cards that already sit next to each other as a valid run/set (in
// the CURRENT order), so a completed meld gets visually lifted/highlighted
// even before the round ends.
//
// Uses the same globally-optimal partition "Urutkan" arranges cards into
// (bestMeldedSubset, which maximizes total melded value) rather than a
// left-to-right greedy scan. A greedy scan can grab a longer-but-worse meld
// first -- e.g. swallowing both jokers into one 4-card run -- stranding
// cards that the optimal partition would have melded separately, which
// showed up as "Urutkan" breaking a hand's Ceki highlight that was visible
// (via manual arrangement) right before sorting. Since this reuses the exact
// same function computeSortedOrder calls, the sort output and the highlight
// can never disagree.
function computeMeldGroups(orderedCards) {
  const { melds } = bestMeldedSubset(orderedCards, normalValue);
  const indexById = new Map(orderedCards.map((c, idx) => [c.id, idx]));

  const byCardId = {};
  for (const { cards } of melds) {
    const indices = cards.map((c) => indexById.get(c.id)).sort((a, b) => a - b);
    const isContiguous = indices.every((idx, i) => i === 0 || idx === indices[i - 1] + 1);
    if (!isContiguous) continue;
    cards.forEach((c) => {
      byCardId[c.id] = true;
    });
  }
  return byCardId;
}

// Groups cards that already form a valid run/set together (in rank order),
// then appends any leftover cards sorted by rank then suit -- this is the
// "Urutkan" (automatic sort) button's ordering.
function computeSortedOrder(cards) {
  const { melds, unmeldedCards } = bestMeldedSubset(cards, normalValue);

  const groups = melds.map((m) => {
    const sortedCards = [...m.cards].sort((a, b) => {
      const rankDiff =
        (RANK_ORDER[meldCardRank(a, m.meld)] || 0) - (RANK_ORDER[meldCardRank(b, m.meld)] || 0);
      if (rankDiff !== 0) return rankDiff;
      return (SUIT_ORDER[meldCardSuit(a, m.meld)] ?? 9) - (SUIT_ORDER[meldCardSuit(b, m.meld)] ?? 9);
    });
    const minRank = Math.min(
      ...sortedCards.map((c) => RANK_ORDER[meldCardRank(c, m.meld)] || 0),
    );
    return { minRank, cards: sortedCards };
  });
  groups.sort((a, b) => a.minRank - b.minRank);

  const leftover = [...unmeldedCards].sort((a, b) => {
    const rankA = a.isJoker ? 14 : RANK_ORDER[a.rank];
    const rankB = b.isJoker ? 14 : RANK_ORDER[b.rank];
    if (rankA !== rankB) return rankA - rankB;
    return (SUIT_ORDER[a.suit] ?? 9) - (SUIT_ORDER[b.suit] ?? 9);
  });

  return [...groups.flatMap((g) => g.cards), ...leftover].map((c) => c.id);
}

// `sortable`: shows a "Urutkan" button (automatic sort) and enables
// drag-to-reorder (manual sort) on the cards themselves. Tap-vs-drag is
// decided by pointer movement distance, so a plain tap still toggles
// selection via `onToggle` -- both ride the same pointer event stream so
// dragging doesn't also fire a duplicate click.
// `disabledCardIds`: cards that render dimmed/non-interactive even when the
// hand overall is selectable.
const Hand = ({ cards, selectedIds = [], onToggle, disabled, sortable, disabledCardIds = [] }) => {
  const [order, setOrder] = useState(cards.map((c) => c.id));
  const [draggingId, setDraggingId] = useState(null);
  const dragState = useRef({ id: null, startX: 0, startY: 0, moved: false });
  const slotRefs = useRef({}); // cardId -> DOM node, used to measure drag targets

  useEffect(() => {
    setOrder((prev) => {
      const currentIds = cards.map((c) => c.id);
      const kept = prev.filter((id) => currentIds.includes(id));
      const added = currentIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [cards]);

  const byId = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);
  const orderedCards = order.map((id) => byId[id]).filter(Boolean);

  const orderKey = orderedCards.map((c) => c.id).join(',');
  const meldGroupByCardId = useMemo(() => computeMeldGroups(orderedCards), [orderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePointerDown(e, cardId) {
    if (!sortable) return;
    dragState.current = { id: cardId, startX: e.clientX, startY: e.clientY, moved: false };
    setDraggingId(cardId);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const state = dragState.current;
    if (!state.id) return;
    if (!state.moved) {
      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
      state.moved = true;
    }

    // Find whichever card slot's horizontal center is closest to the
    // pointer, and move the dragged card there. Measuring live DOM rects
    // (rather than document.elementFromPoint) is robust to vertical wobble
    // during a drag and to the dragged card's own elevated z-index
    // potentially occluding the hit-test point.
    let closestId = null;
    let closestDist = Infinity;
    for (const id of order) {
      const node = slotRefs.current[id];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - centerX);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    }
    if (!closestId || closestId === state.id) return;

    setOrder((prev) => {
      const from = prev.indexOf(state.id);
      const to = prev.indexOf(closestId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, state.id);
      return next;
    });
  }

  function handlePointerUp(e, cardId) {
    const state = dragState.current;
    const wasTap = state.id === cardId && !state.moved;
    dragState.current = { id: null, startX: 0, startY: 0, moved: false };
    setDraggingId(null);
    if (wasTap) {
      const cardDisabled = disabled || disabledCardIds.includes(cardId);
      if (!cardDisabled && onToggle) onToggle(cardId);
    }
  }

  function handlePointerCancel() {
    dragState.current = { id: null, startX: 0, startY: 0, moved: false };
    setDraggingId(null);
  }

  return (
    <StyledWrapper>
      {sortable && (
        <StyledSortButton type="button" onClick={() => setOrder(computeSortedOrder(cards))}>
          Urutkan
        </StyledSortButton>
      )}
      <StyledHand>
        {orderedCards.map((card, idx) => {
          const cardDisabled = disabled || disabledCardIds.includes(card.id);
          const cardEl = (
            <PokerCard
              card={card}
              interactive={!cardDisabled && !!onToggle}
              selected={selectedIds.includes(card.id)}
              melded={!!meldGroupByCardId[card.id]}
              onClick={!sortable ? () => !cardDisabled && onToggle && onToggle(card.id) : undefined}
              width="10.5vw"
              maxWidth="108px"
              minWidth="66px"
              compact
            />
          );

          // Cards overlap (fanned like a hand of cards, later cards on top)
          // so more of a large hand fits on screen without horizontal
          // scrolling. Drag-to-reorder only applies when `sortable`.
          return (
            <StyledCardSlot
              key={card.id}
              draggable={sortable}
              ref={(el) => {
                if (el) slotRefs.current[card.id] = el;
                else delete slotRefs.current[card.id];
              }}
              data-card-id={card.id}
              style={{ zIndex: draggingId === card.id ? 100 : idx }}
              onPointerDown={sortable ? (e) => handlePointerDown(e, card.id) : undefined}
              onPointerMove={sortable ? handlePointerMove : undefined}
              onPointerUp={sortable ? (e) => handlePointerUp(e, card.id) : undefined}
              onPointerCancel={sortable ? handlePointerCancel : undefined}
            >
              {cardEl}
            </StyledCardSlot>
          );
        })}
      </StyledHand>
    </StyledWrapper>
  );
};

export default Hand;
