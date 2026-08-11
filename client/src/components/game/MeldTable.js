import React from 'react';
import styled from 'styled-components';
import PokerCard from './PokerCard';
import Text from '../typography/Text';

const StyledMeldTable = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 2rem;
`;

const StyledMeldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
`;

const StyledMeld = styled.div`
  display: flex;

  * ~ * {
    margin-left: -2.5rem;
  }
`;

// Renders a player's melds (cards taken from the discard pile and laid
// face-up on the table). `melds`: [{ id, cards, meld }].
const MeldTable = ({ melds, label }) => {
  if (!melds || melds.length === 0) return null;

  return (
    <StyledMeldTable>
      {label && <Text fontSize="0.9rem">{label}</Text>}
      <StyledMeldRow>
        {melds.map((entry) => (
          <StyledMeld key={entry.id}>
            {entry.cards.map((card) => (
              <PokerCard key={card.id} card={card} width="4vw" maxWidth="45px" minWidth="28px" />
            ))}
          </StyledMeld>
        ))}
      </StyledMeldRow>
    </StyledMeldTable>
  );
};

export default MeldTable;
