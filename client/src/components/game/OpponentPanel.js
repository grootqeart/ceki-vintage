import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import Text from '../typography/Text';
import PokerCard from './PokerCard';
import MeldTable from './MeldTable';
import Avatar from '../user/Avatar';

const blink = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
`;

const StyledCekiTag = styled.span`
  display: inline-block;
  background-color: #0a8f4c;
  color: #ffffff;
  font-weight: bold;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
  animation: ${blink} 1s ease-in-out infinite;
`;

const StyledPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${({ align }) =>
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'};
  padding: ${({ flat }) => (flat ? '0.15rem' : '0.5rem')};
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  background-color: ${({ flat, theme }) => (flat ? 'transparent' : theme.colors.lightBg)};
  opacity: ${({ connected }) => (connected ? 1 : 0.5)};

  ${({ isTurn, flat }) =>
    isTurn &&
    !flat &&
    css`
      outline: 3px solid ${(props) => props.theme.colors.primaryCta};
    `}
`;

const StyledTurnDot = styled.span`
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  display: inline-block;
  background-color: ${(props) => props.theme.colors.primaryCta};
  flex-shrink: 0;
`;

const StyledHiddenHand = styled.div`
  display: flex;

  ${({ vertical }) =>
    vertical
      ? css`
          flex-direction: column;
          align-items: center;

          * ~ * {
            margin-top: -3.1rem;
          }
        `
      : css`
          * ~ * {
            margin-left: -2.75rem;
          }
        `}
`;

// On the rotated portrait table the opponents sit along the left/right
// edges, where a normal horizontal name label sticks out past the felt and
// gets clipped by the screen. Turning the label vertical (avatar on top,
// text running downward) shrinks its horizontal footprint to about one
// character, so it fits in the narrow strip beside the card stack.
const StyledNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  ${({ vertical, reverse }) =>
    vertical &&
    css`
      flex-direction: column;
      gap: 0.2rem;
      /* Floated out of flow entirely so the label costs the panel no width:
         the card stack alone decides how far the seat sits from the felt's
         edge. Hanging past the table onto the page background is fine and
         intended -- it just has to draw above everything. */
      position: absolute;
      top: 0;
      z-index: 40;
      ${reverse ? 'left: 100%;' : 'right: 100%;'}
    `}
`;

// Vertical mode is the positioning context for the floated-out name label
// (see StyledNameRow), so only the card stack occupies the flow.
const StyledMain = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  ${({ vertical }) => vertical && 'position: relative;'}
`;

const StyledNameText = styled(Text)`
  margin-bottom: 0;

  ${({ vertical }) =>
    vertical &&
    css`
      writing-mode: vertical-rl;
      text-orientation: mixed;
      white-space: nowrap;
    `}
`;

const OpponentPanel = ({
  player,
  handCount,
  melds,
  isTurn,
  ceki,
  isLastPlace,
  flat,
  vertical,
  align,
}) => (
  <StyledPanel isTurn={isTurn} connected={player.connected} flat={flat} align={align}>
    <StyledMain vertical={vertical} reverse={align === 'right'}>
      <StyledNameRow vertical={vertical} reverse={align === 'right'}>
        {flat && isTurn && <StyledTurnDot />}
        <Avatar
          name={player.name}
          size={vertical ? '1.15rem' : '1.6rem'}
          badge={isLastPlace ? '\u{1F921}' : null}
          badgeLabel="last place"
          online={player.connected}
        />
        <StyledNameText vertical={vertical} fontSize={vertical ? '0.75rem' : '0.9rem'}>
          <strong>{player.name}</strong>
          {player.isHost ? ' (host)' : ''}
          {/* The dot already says this. Spelling it out too would stretch the
              portrait label, which runs vertically and is tight on space. */}
          {!player.connected && !vertical ? ' -- terputus' : ''}
        </StyledNameText>
        {ceki && <StyledCekiTag>CEKI!</StyledCekiTag>}
      </StyledNameRow>
      <StyledHiddenHand vertical={vertical}>
        {Array.from({ length: handCount }).map((_, i) => (
          <PokerCard key={i} card={{}} faceDown width="4vw" maxWidth="45px" minWidth="28px" />
        ))}
      </StyledHiddenHand>
    </StyledMain>
    <MeldTable melds={melds} />
  </StyledPanel>
);

export default OpponentPanel;
