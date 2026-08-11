import React from 'react';
import styled from 'styled-components';
import PokerCard from './PokerCard';

// Direct port of the classic jQuery "playing-cards" shuffle effect
// (vineetgarg90's stack-riffle demo): a card pops out sideways -- an almost
// instant jump out, a short hold, then a snap back to the stack with a
// z-index bump so the returning card visually lands on top.
export const STACK_SIZE = 8;
export const POP_OUT_MS = 90;
export const POP_BACK_MS = 200;
const POP_OFFSET = 44; // px sideways -- proportionally similar to the reference's 145px on a ~100px-wide card

const StyledStackCard = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
`;

// Pure visual: a fanned stack of face-down cards with one card (per `pop`)
// popped out to the side / snapping back. Shared between the round-start
// deal animation (auto-cascading over time, see DealAnimation.js) and the
// last-place mini-game (one pop per tap, see LoserMiniGame.js).
const CardStackVisual = ({
  pop,
  cardWidth = '4.5vw',
  cardMaxWidth = '52px',
  cardMinWidth = '34px',
}) => (
  <>
    {Array.from({ length: STACK_SIZE }).map((_, i) => {
      const isActive = pop && pop.index === i;
      const poppedOut = isActive && pop.stage === 'out';
      // A slight cascading offset per card gives the idle stack a fanned
      // "deck" look (mirrors the reference's stack_cards()).
      const baseX = i * 1.6;
      const baseY = -i * 0.7;
      const x = baseX + (poppedOut ? POP_OFFSET : 0);
      const y = baseY;
      const rotate = poppedOut ? 8 : 0;
      return (
        <StyledStackCard
          key={i}
          style={{
            zIndex: isActive && pop.stage === 'back' ? STACK_SIZE + 1 : i,
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotate}deg)`,
            transition: poppedOut
              ? `transform ${POP_OUT_MS}ms ease-out`
              : `transform ${POP_BACK_MS}ms ease-in`,
          }}
        >
          <PokerCard
            card={{}}
            faceDown
            width={cardWidth}
            maxWidth={cardMaxWidth}
            minWidth={cardMinWidth}
          />
        </StyledStackCard>
      );
    })}
  </>
);

export default CardStackVisual;
