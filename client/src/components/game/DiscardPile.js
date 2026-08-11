import React from 'react';
import styled from 'styled-components';
import PokerCard from './PokerCard';
import Text from '../typography/Text';

const StyledDiscardPile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledStack = styled.div`
  display: flex;

  * ~ * {
    margin-left: -3.5rem;
  }
`;

// Shows up to `maxVisible` cards from the top of the discard pile (deepest
// first, newest/top last). Clicking a card selects "take down to here" --
// `selectedDepth` cards counted from the top, matching the `count` param
// meldFromDiscard expects.
const DiscardPile = ({ pile, selectedDepth, onSelectDepth, maxVisible = 7, selectable }) => {
  const visible = pile.slice(Math.max(0, pile.length - maxVisible));

  if (visible.length === 0) {
    return (
      <StyledDiscardPile>
        <Text fontSize="0.85rem">Buangan kosong</Text>
      </StyledDiscardPile>
    );
  }

  return (
    <StyledDiscardPile>
      <StyledStack>
        {visible.map((card, idx) => {
          const depthFromTop = visible.length - idx;
          const included = selectedDepth && depthFromTop <= selectedDepth;
          return (
            <PokerCard
              key={card.id}
              card={card}
              interactive={selectable}
              selected={!!included}
              onClick={() => selectable && onSelectDepth(depthFromTop)}
              width="5vw"
              maxWidth="60px"
              minWidth="38px"
            />
          );
        })}
      </StyledStack>
      <Text fontSize="0.85rem">
        {selectedDepth ? `Mengambil ${selectedDepth} kartu` : 'Klik kartu untuk ambil'}
      </Text>
    </StyledDiscardPile>
  );
};

export default DiscardPile;
