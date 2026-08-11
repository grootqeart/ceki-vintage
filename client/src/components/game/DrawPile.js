import React from 'react';
import styled from 'styled-components';
import PokerCard from './PokerCard';
import Text from '../typography/Text';

const StyledDrawPile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
`;

const DrawPile = ({ count, canDraw, onDraw }) => (
  <StyledDrawPile clickable={canDraw} onClick={() => canDraw && onDraw()}>
    <PokerCard
      card={{ isJoker: false }}
      faceDown
      interactive={canDraw}
      width="5vw"
      maxWidth="60px"
      minWidth="38px"
    />
    <Text fontSize="0.85rem">Sisa: {count}</Text>
  </StyledDrawPile>
);

export default DrawPile;
