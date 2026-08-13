import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import PokerCard from './PokerCard';
import { bestMeldedSubset } from '../../pokergame/ceki/combinations';
import { cardValue } from '../../pokergame/ceki/cardUtils';
import { RANK_ORDER } from '../../pokergame/ceki/constants';

const DRAG_THRESHOLD = 8; // px of movement before a press counts as a drag, not a tap
const DRAG_LIFT_PX = 14; // how far a held card rises off the fan
const AUTOSCROLL_EDGE = 48; // px from either edge where auto-scroll kicks in
const AUTOSCROLL_MAX_PX = 14; // px per frame at the very edge
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

// `canDrag`, not `draggable`: the latter is a real HTML attribute, and
// styled-components forwards it straight to the div. That turned every card
// into a native HTML5 drag source, and on a mouse the browser's own drag
// takes over on the first move -- it fires pointercancel, which killed the
// custom reorder before it started. Touch never triggers native drag, so the
// bug only ever showed on desktop.
const StyledCardSlot = styled.div`
  touch-action: none;
  cursor: ${({ canDrag, dragging }) =>
    dragging ? 'grabbing' : canDrag ? 'grab' : 'default'};
  flex: 0 0 auto;
  position: relative;

  &:not(:first-child) {
    margin-left: -2.4rem;
  }

  ${({ dragging }) =>
    dragging &&
    css`
      /* No transition while held -- the transform is driven straight from
         pointer events, and easing it would make the card lag the finger. */
      filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.45));
    `}
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
  // Live pointer offset of the card being dragged, so it tracks the finger
  // instead of sitting still until the order happens to change.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef({ id: null, startX: 0, startY: 0, moved: false });
  const slotRefs = useRef({}); // cardId -> DOM node, used to measure drag targets
  const scrollerRef = useRef(null);
  const autoScrollRef = useRef({ raf: null, dx: 0 });

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

  // Finding the best meld partition is a bitmask DP over the whole hand, and
  // the order changes on every card the drag crosses -- running it mid-drag
  // put that search in the middle of the gesture. The highlight can't be
  // right until the card lands anyway, so freeze the last result while a
  // drag is in flight and recompute once on drop.
  const orderKey = orderedCards.map((c) => c.id).join(',');
  const meldKey = draggingId ? null : orderKey;
  const lastMeldGroups = useRef({});
  const meldGroupByCardId = useMemo(() => {
    if (meldKey === null) return lastMeldGroups.current;
    lastMeldGroups.current = computeMeldGroups(orderedCards);
    return lastMeldGroups.current;
  }, [meldKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nudges the horizontally-scrollable hand while a drag is held near either
  // edge. Without it a card simply can't be moved to a position that's
  // currently off-screen, since the container never scrolls on its own during
  // a pointer-captured drag.
  function stopAutoScroll() {
    if (autoScrollRef.current.raf !== null) {
      cancelAnimationFrame(autoScrollRef.current.raf);
      autoScrollRef.current.raf = null;
    }
    autoScrollRef.current.dx = 0;
  }

  function stepAutoScroll() {
    const el = scrollerRef.current;
    const { dx } = autoScrollRef.current;
    if (!el || dx === 0) {
      autoScrollRef.current.raf = null;
      return;
    }
    el.scrollLeft += dx;
    autoScrollRef.current.raf = requestAnimationFrame(stepAutoScroll);
  }

  function updateAutoScroll(clientX) {
    const el = scrollerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflows = el.scrollWidth > el.clientWidth + 1;
    let dx = 0;
    if (overflows) {
      const intoLeft = clientX - rect.left;
      const intoRight = rect.right - clientX;
      // Speed ramps up the closer the finger gets to the edge.
      if (intoLeft < AUTOSCROLL_EDGE) {
        dx = -Math.ceil(((AUTOSCROLL_EDGE - Math.max(intoLeft, 0)) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_PX);
      } else if (intoRight < AUTOSCROLL_EDGE) {
        dx = Math.ceil(((AUTOSCROLL_EDGE - Math.max(intoRight, 0)) / AUTOSCROLL_EDGE) * AUTOSCROLL_MAX_PX);
      }
    }
    autoScrollRef.current.dx = dx;
    if (dx !== 0 && autoScrollRef.current.raf === null) {
      autoScrollRef.current.raf = requestAnimationFrame(stepAutoScroll);
    } else if (dx === 0) {
      stopAutoScroll();
    }
  }

  function handlePointerDown(e, cardId) {
    if (!sortable) return;
    dragState.current = { id: cardId, startX: e.clientX, startY: e.clientY, moved: false };
    setDraggingId(cardId);
    setDragOffset({ x: 0, y: 0 });
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

    setDragOffset({ x: e.clientX - state.startX, y: e.clientY - state.startY });
    updateAutoScroll(e.clientX);

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

    const from = order.indexOf(state.id);
    const to = order.indexOf(closestId);
    if (from === -1 || to === -1 || from === to) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, state.id);
    setOrder(next);

    // The card just moved to a different slot, so the finger's offset is now
    // measured from the wrong origin -- rebase it, otherwise the card lurches
    // a full slot away from the finger on every swap. Done out here rather
    // than inside the setOrder updater, which must stay side-effect free.
    dragState.current.startX = e.clientX;
    dragState.current.startY = e.clientY;
    setDragOffset({ x: 0, y: 0 });
  }

  function endDrag(cardId, { tapAllowed }) {
    const state = dragState.current;
    const wasTap = tapAllowed && state.id === cardId && !state.moved;
    dragState.current = { id: null, startX: 0, startY: 0, moved: false };
    setDraggingId(null);
    setDragOffset({ x: 0, y: 0 });
    stopAutoScroll();
    if (wasTap) {
      const cardDisabled = disabled || disabledCardIds.includes(cardId);
      if (!cardDisabled && onToggle) onToggle(cardId);
    }
  }

  function handlePointerUp(cardId) {
    endDrag(cardId, { tapAllowed: true });
  }

  useEffect(() => stopAutoScroll, []);

  function handlePointerCancel(cardId) {
    endDrag(cardId, { tapAllowed: false });
  }

  return (
    <StyledWrapper>
      {sortable && (
        <StyledSortButton type="button" onClick={() => setOrder(computeSortedOrder(cards))}>
          Urutkan
        </StyledSortButton>
      )}
      <StyledHand ref={scrollerRef}>
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
              canDrag={sortable}
              draggable={false}
              ref={(el) => {
                if (el) slotRefs.current[card.id] = el;
                else delete slotRefs.current[card.id];
              }}
              data-card-id={card.id}
              dragging={draggingId === card.id}
              style={{
                zIndex: draggingId === card.id ? 100 : idx,
                // Follows the finger. Applied to the slot rather than the
                // card image so PokerCard's own `selected` transform stays
                // free to do its own thing.
                transform:
                  draggingId === card.id
                    ? `translate(${dragOffset.x}px, ${dragOffset.y - DRAG_LIFT_PX}px)`
                    : undefined,
              }}
              onPointerDown={sortable ? (e) => handlePointerDown(e, card.id) : undefined}
              onPointerMove={sortable ? handlePointerMove : undefined}
              onPointerUp={sortable ? () => handlePointerUp(card.id) : undefined}
              onPointerCancel={sortable ? () => handlePointerCancel(card.id) : undefined}
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
