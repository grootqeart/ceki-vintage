import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import CardStackVisual, { STACK_SIZE, POP_OUT_MS } from './CardStackVisual';

// Full-screen gate shown to the current sole last-place player before a new
// round: they must "shuffle" the deck -- tap the screen (or press space) --
// `target` times before the round is dealt. `target` escalates 50 per
// consecutive last-place round (capped at 400 server-side). Each tap pops
// one card in the stack (the same riffle-shuffle visual as the round-start
// deal animation, see CardStackVisual.js), so the tapping actually reads as
// shuffling rather than just filling a bare progress bar.
const POP_HOLD_MS = 60; // shorter than the auto-cascade -- taps can come in fast

const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background-color: rgba(15, 30, 26, 0.97);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  color: white;
  text-align: center;
  user-select: none;
  touch-action: none;
  cursor: pointer;
`;

const StyledStage = styled.div`
  position: relative;
  width: 140px;
  height: 130px;
  margin-bottom: 0.5rem;
`;

const StyledBarTrack = styled.div`
  width: 100%;
  max-width: 320px;
  height: 1rem;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.15);
  overflow: hidden;
  margin: 0.75rem 0;
`;

const StyledBarFill = styled.div`
  height: 100%;
  background-color: #ffd54f;
  transition: width 75ms linear;
`;

const StyledCount = styled.div`
  font-size: 2.2rem;
  font-weight: bold;

  span {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const LoserMiniGame = ({ target, onDone, onProgress }) => {
  const [count, setCount] = useState(0);
  const [pop, setPop] = useState(null); // { index, stage: 'out' | 'back' }
  const stackIndexRef = useRef(0);
  const popTimerRef = useRef(null);
  // `onDone` (completeMiniGame from context) isn't a stable function
  // reference across renders, so guard against re-firing it while waiting
  // for the server round-trip that will unmount this screen.
  const firedRef = useRef(false);

  function triggerPop() {
    const index = stackIndexRef.current % STACK_SIZE;
    stackIndexRef.current += 1;
    clearTimeout(popTimerRef.current);
    setPop({ index, stage: 'out' });
    popTimerRef.current = setTimeout(() => {
      setPop({ index, stage: 'back' });
    }, POP_OUT_MS + POP_HOLD_MS);
  }

  function tap() {
    setCount((c) => {
      const next = Math.min(c + 1, target);
      if (onProgress) onProgress(next);
      return next;
    });
    triggerPop();
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return;
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => () => clearTimeout(popTimerRef.current), []);

  useEffect(() => {
    if (count >= target && !firedRef.current) {
      firedRef.current = true;
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, target]);

  const pct = Math.min(100, (count / target) * 100);

  return (
    <StyledOverlay onPointerDown={tap}>
      <StyledStage>
        <CardStackVisual pop={pop} cardWidth="9vw" cardMaxWidth="70px" cardMinWidth="46px" />
      </StyledStage>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
        <span role="img" aria-label="clown">
          {'\u{1F921}'}
        </span>{' '}
        Kamu peringkat terakhir!
      </h2>
      <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>
        Kocok kartu buat semua orang -- tap layar atau tekan spasi {target}x biar ronde bisa
        mulai
      </p>
      <StyledBarTrack>
        <StyledBarFill style={{ width: `${pct}%` }} />
      </StyledBarTrack>
      <StyledCount>
        {count}
        <span> / {target}</span>
      </StyledCount>
      <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.5 }}>Terus tap!</p>
    </StyledOverlay>
  );
};

export default LoserMiniGame;
