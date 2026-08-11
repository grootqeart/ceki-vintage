import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import CardStackVisual, { STACK_SIZE, POP_OUT_MS } from './CardStackVisual';

// Read-only mirror of LoserMiniGame's shuffle visual + progress bar, shown
// to everyone ELSE in the room while the sole last-place player taps
// through their penalty -- so watching players see the same stack-pop
// animation and a live-updating count instead of a static "please wait"
// screen. `count` is relayed from the tapping player's client in real time
// (see RoomState.js's MINIGAME_PROGRESS listener); this component just pops
// the stack once per count increase, purely presentational.
const POP_HOLD_MS = 60;

const StyledStage = styled.div`
  position: relative;
  width: 140px;
  height: 130px;
  margin: 0 auto 0.5rem;
`;

const StyledBarTrack = styled.div`
  width: 100%;
  max-width: 320px;
  height: 1rem;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.12);
  overflow: hidden;
  margin: 0.75rem auto;
`;

const StyledBarFill = styled.div`
  height: 100%;
  background-color: #d4a017;
  transition: width 75ms linear;
`;

const StyledCount = styled.div`
  font-size: 1.6rem;
  font-weight: bold;
  text-align: center;

  span {
    font-size: 1rem;
    opacity: 0.5;
  }
`;

const MiniGameWatchBar = ({ count, target }) => {
  const [pop, setPop] = useState(null);
  const stackIndexRef = useRef(0);
  const popTimerRef = useRef(null);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (count > prevCountRef.current) {
      const index = stackIndexRef.current % STACK_SIZE;
      stackIndexRef.current += 1;
      clearTimeout(popTimerRef.current);
      setPop({ index, stage: 'out' });
      popTimerRef.current = setTimeout(() => {
        setPop({ index, stage: 'back' });
      }, POP_OUT_MS + POP_HOLD_MS);
    }
    prevCountRef.current = count;
  }, [count]);

  useEffect(() => () => clearTimeout(popTimerRef.current), []);

  const pct = target > 0 ? Math.min(100, (count / target) * 100) : 0;

  return (
    <div>
      <StyledStage>
        <CardStackVisual pop={pop} cardWidth="9vw" cardMaxWidth="70px" cardMinWidth="46px" />
      </StyledStage>
      <StyledBarTrack>
        <StyledBarFill style={{ width: `${pct}%` }} />
      </StyledBarTrack>
      <StyledCount>
        {count}
        <span> / {target}</span>
      </StyledCount>
    </div>
  );
};

export default MiniGameWatchBar;
