import React from 'react';
import styled, { css } from 'styled-components';
import cards from './cards';

const StyledPokerCardWrapper = styled.div`
  display: inline-block;
  margin: ${({ compact }) => (compact ? '0' : '1rem 0.5rem')};
  /* Deliberately no mount-in fade/slide animation here anymore -- the
     previous version started every card at opacity:0 and animated to 1 via
     a CSS @keyframes. On some mobile WebKit builds that animation silently
     never triggers (or never completes) when many cards mount at once,
     leaving cards stuck at opacity:0 -- present in the DOM, taking up
     layout space, but permanently invisible. Cards should just always be
     visible; not worth the risk for a cosmetic flourish. */

  img,
  .joker-placeholder {
    width: ${({ width }) => width || '7vw'};
    max-width: ${({ maxWidth }) => maxWidth || '80px'};
    min-width: ${({ minWidth }) => minWidth || '50px'};
    box-shadow: 10px 10px 30px rgba(0, 0, 0, 0.1);
  }

  /* Prevent the browser's native image-drag (ghost preview) from hijacking
     custom pointer-based drag-to-reorder in Hand.js. */
  img {
    -webkit-user-drag: none;
    user-select: none;
    -webkit-user-select: none;
  }

  .joker-placeholder {
    aspect-ratio: 2 / 3;
    background: repeating-linear-gradient(
      45deg,
      #24516a,
      #24516a 10px,
      #1a3c50 10px,
      #1a3c50 20px
    );
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #eae1cd;
    font-weight: bold;
    font-size: 0.8rem;
    text-align: center;
  }

  ${({ interactive }) =>
    interactive &&
    css`
      cursor: pointer;
    `}

  ${({ selected }) =>
    selected &&
    css`
      img,
      .joker-placeholder {
        outline: 3px solid ${(props) => props.theme.colors.primaryCta};
        outline-offset: 2px;
        transform: translateY(-0.5rem);
      }
    `}

  ${({ melded, selected }) =>
    melded &&
    !selected &&
    css`
      img,
      .joker-placeholder {
        outline: 2px solid gold;
        outline-offset: 2px;
        box-shadow: 0 0 8px 1px rgba(255, 215, 0, 0.55);
      }
    `}
`;

const PokerCard = ({
  card,
  width,
  minWidth,
  maxWidth,
  faceDown,
  selected,
  melded,
  interactive,
  onClick,
  compact,
}) => {
  const { suit, rank, isJoker, id } = card || {};
  const concat = faceDown ? 'hiddenhidden' : isJoker ? id : `${suit}${rank}`;
  const showJokerPlaceholder = !faceDown && isJoker && !cards[concat];

  return (
    <StyledPokerCardWrapper
      width={width}
      minWidth={minWidth}
      maxWidth={maxWidth}
      selected={selected}
      melded={melded}
      interactive={interactive}
      onClick={onClick}
      compact={compact}
    >
      {showJokerPlaceholder ? (
        <div className="joker-placeholder">JOKER</div>
      ) : (
        <img
          src={cards[concat]}
          alt={faceDown ? 'hidden card' : concat}
          draggable={false}
        />
      )}
    </StyledPokerCardWrapper>
  );
};

export default PokerCard;
