import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import CardStackVisual, { STACK_SIZE, POP_OUT_MS } from './CardStackVisual';

// Purely a client-side visual flourish -- the server already deals every
// card atomically the instant the round starts, so the hand simply appears
// once this finishes. Auto-cascades one pop at a time through the stack
// (see CardStackVisual.js for the actual pop motion).
const SHUFFLE_MS = 1900;
const POP_STEP_MS = 260; // stagger between each card's pop
const POP_HOLD_MS = 110; // how long a popped-out card stays out before snapping back

const StyledOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 500;
  pointer-events: none;
`;

const StyledLabel = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 165%);
  color: white;
  font-size: 0.75rem;
  text-align: center;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
`;

const DealAnimation = ({ onComplete }) => {
  const [pop, setPop] = useState(null); // { index, stage: 'out' | 'back' }
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t = setTimeout(() => onCompleteRef.current(), SHUFFLE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers = [];
    let i = 0;

    const popNext = () => {
      if (cancelled) return;
      const index = i % STACK_SIZE;
      setPop({ index, stage: 'out' });
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          setPop({ index, stage: 'back' });
        }, POP_OUT_MS + POP_HOLD_MS),
      );
      i += 1;
      if (i * POP_STEP_MS < SHUFFLE_MS - POP_OUT_MS - POP_HOLD_MS) {
        timers.push(setTimeout(popNext, POP_STEP_MS));
      }
    };

    timers.push(setTimeout(popNext, 150));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <StyledOverlay>
      <CardStackVisual pop={pop} />
      <StyledLabel>Mengocok kartu...</StyledLabel>
    </StyledOverlay>
  );
};

export default DealAnimation;
