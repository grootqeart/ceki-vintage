import React, { useState } from 'react';
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
    margin-left: ${({ tight }) => (tight ? '-1.4rem' : '-2.5rem')};
  }
`;

// Collapsed state: a single card standing in for the whole set, with the
// total card count badged on it. Opponent seats sit in a narrow strip beside
// the felt on a phone, where laying every melded card out overlaps the
// player's face-down hand and spills off the table.
const StyledCollapsedButton = styled.button`
  position: relative;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  line-height: 0;
`;

const StyledCount = styled.span`
  position: absolute;
  top: -5px;
  right: -7px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: #b8860b;
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  line-height: 15px;
  text-align: center;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
`;

// Expanded melds float above the felt rather than growing the seat's own
// box, so opening them can't shove the rest of the table around.
const StyledPopover = styled.div`
  position: absolute;
  z-index: 60;
  top: 0;
  ${({ side }) => (side === 'right' ? 'right: 0;' : 'left: 0;')}
  background-color: rgba(20, 40, 35, 0.94);
  border-radius: 10px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  width: max-content;
  max-width: 60vw;
`;

const StyledPopoverHeader = styled.button`
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 0.65rem;
  border-radius: 6px;
  padding: 0.15rem 0.4rem;
  cursor: pointer;
  align-self: flex-end;
`;

const COMPACT_CARD = { width: '8vw', maxWidth: '34px', minWidth: '26px' };
const FULL_CARD = { width: '4vw', maxWidth: '45px', minWidth: '28px' };

// Renders a player's melds (cards taken from the discard pile and laid
// face-up on the table). `melds`: [{ id, cards, meld }].
// `collapsible` shows just one card until tapped -- used for opponent seats
// on the portrait table, where space beside the felt is very tight.
// `side` picks which edge an opened popover is anchored to.
const MeldTable = ({ melds, label, collapsible, side }) => {
  const [open, setOpen] = useState(false);

  if (!melds || melds.length === 0) return null;

  const cardSize = collapsible ? COMPACT_CARD : FULL_CARD;
  const rows = melds.map((entry) => (
    <StyledMeld key={entry.id} tight={!!collapsible}>
      {entry.cards.map((card) => (
        <PokerCard key={card.id} card={card} {...cardSize} compact={!!collapsible} />
      ))}
    </StyledMeld>
  ));

  if (collapsible) {
    const totalCards = melds.reduce((n, m) => n + m.cards.length, 0);

    if (!open) {
      return (
        <StyledCollapsedButton
          type="button"
          onClick={() => setOpen(true)}
          title={`Lihat ${totalCards} kartu meld`}
          aria-label={`Lihat ${totalCards} kartu meld`}
        >
          <PokerCard card={melds[0].cards[0]} {...cardSize} compact />
          <StyledCount>{totalCards}</StyledCount>
        </StyledCollapsedButton>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        {/* Keeps the collapsed card in the layout so the seat doesn't shift
            as the popover opens and closes. */}
        <PokerCard card={melds[0].cards[0]} {...cardSize} compact />
        <StyledPopover side={side}>
          <StyledPopoverHeader type="button" onClick={() => setOpen(false)}>
            Tutup &times;
          </StyledPopoverHeader>
          {rows}
        </StyledPopover>
      </div>
    );
  }

  return (
    <StyledMeldTable>
      {label && <Text fontSize="0.9rem">{label}</Text>}
      <StyledMeldRow>{rows}</StyledMeldRow>
    </StyledMeldTable>
  );
};

export default MeldTable;
