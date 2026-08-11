import React from 'react';
import styled from 'styled-components';
import Text from '../typography/Text';
import PokerCard from './PokerCard';
import { cardValue } from '../../pokergame/ceki/cardUtils';

const SUIT_SYMBOL = { s: '♠', h: '♥', d: '♦', c: '♣' };

function cardShort(c) {
  if (!c) return '';
  if (c.isJoker) return 'Joker';
  return `${c.rank}${SUIT_SYMBOL[c.suit] || ''}`;
}

// Normal-tariff value of one meld ({ cards, meld }), impersonating jokers as
// the rank they represent within the meld.
function meldNormalValue(m) {
  return m.cards.reduce((sum, c) => {
    if (c.isJoker) {
      const a = m.meld && m.meld.jokerAssignments.find((j) => j.jokerId === c.id);
      return sum + cardValue(c, 'normal', a ? a.rank : undefined);
    }
    return sum + cardValue(c, 'normal');
  }, 0);
}

// Itemized score breakdown for one player from their round-end detail
// (see server/pokergame/ceki/round.js scoreRestingSeat/buildRoundEndResult).
// Ported from the Ceki reference's MiniScoreboard.js computeBreakdown.
function computeBreakdown(detail) {
  if (!detail) return null;
  const tableMelds = detail.tableMelds || [];
  const melds = detail.melds || [];
  const combos = [...tableMelds, ...melds].reduce((s, m) => s + meldNormalValue(m), 0);
  const tutupan = detail.tutupanCard ? cardValue(detail.tutupanCard, 'high') : 0;
  const minus = (detail.unmeldedCards || []).reduce((s, c) => s + cardValue(c, 'normal'), 0);
  const kejebur = detail.kejeburPenalty || 0;
  return {
    combos,
    tutupan,
    minus,
    kejebur,
    hasTutupan: !!detail.tutupanCard,
    hasCeburan: !!detail.ceburanCard,
  };
}

export const REASON_LABEL = {
  'closed-tutupan': 'Tutup Kartu — Tutupan',
  'closed-ceburan': 'Tutup Kartu — Kejebur (Ceburan)',
  'deck-empty': 'Deck Habis',
  'closed-meja': 'Tutup Kartu — Habis di Meja',
};

const StyledCard = styled.div`
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.6rem;
  text-align: left;
`;

const StyledHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 0.9rem;
`;

const StyledBreakdownRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #666;
  margin-top: 0.25rem;
`;

const StyledCardRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

// Full itemized round-end breakdown for one player, matching the Ceki
// reference's RoundResultModal per-player card. `players` (full room roster)
// is only used to resolve the name of whoever kejebur-claimed this player's
// discard, if any.
const RoundResultDetail = ({ player, score, detail, players = [] }) => {
  const bd = computeBreakdown(detail);
  const kejeburByName = detail && detail.kejeburBy != null
    ? (players.find((p) => p.seatId === detail.kejeburBy) || {}).name
    : null;

  return (
    <StyledCard>
      <StyledHeaderRow>
        <span>{player.name}</span>
        <span style={{ color: score >= 0 ? '#0a8f4c' : '#c0392b' }}>
          {score >= 0 ? '+' : ''}
          {score}
        </span>
      </StyledHeaderRow>

      {bd && (bd.combos > 0 || bd.minus > 0 || bd.hasTutupan || bd.kejebur > 0) && (
        <StyledBreakdownRow>
          {bd.combos > 0 && <span>Kombinasi +{bd.combos}</span>}
          {bd.hasTutupan && (
            <span style={{ color: '#b8860b' }}>
              Tutupan {cardShort(detail.tutupanCard)} +{bd.tutupan} (tinggi)
            </span>
          )}
          {bd.hasCeburan && <span>Ceburan {cardShort(detail.ceburanCard)} (normal)</span>}
          {bd.minus > 0 && <span style={{ color: '#c0392b' }}>Tidak jadi -{bd.minus}</span>}
          {bd.kejebur > 0 && <span style={{ color: '#c0392b' }}>Kena kejebur -{bd.kejebur}</span>}
        </StyledBreakdownRow>
      )}

      {detail && detail.tableMelds && detail.tableMelds.length > 0 && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            Meld di meja:
          </Text>
          <StyledCardRow>
            {detail.tableMelds.flatMap((m) =>
              m.cards.map((c) => (
                <PokerCard key={c.id} card={c} width="3vw" maxWidth="32px" minWidth="22px" />
              )),
            )}
          </StyledCardRow>
        </>
      )}

      {detail && detail.melds && detail.melds.length > 0 && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            Kombinasi di tangan:
          </Text>
          <StyledCardRow>
            {detail.melds.flatMap((m, mi) =>
              m.cards.map((c) => (
                <PokerCard key={`${mi}-${c.id}`} card={c} width="3vw" maxWidth="32px" minWidth="22px" />
              )),
            )}
          </StyledCardRow>
        </>
      )}

      {detail && detail.unmeldedCards && detail.unmeldedCards.length > 0 && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            Tidak jadi:
          </Text>
          <StyledCardRow>
            {detail.unmeldedCards.map((c) => (
              <PokerCard key={c.id} card={c} width="3vw" maxWidth="32px" minWidth="22px" />
            ))}
          </StyledCardRow>
        </>
      )}

      {detail && detail.tutupanCard && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem', color: '#b8860b' }}>
            Tutupan (tinggi):
          </Text>
          <StyledCardRow>
            <PokerCard card={detail.tutupanCard} width="3vw" maxWidth="32px" minWidth="22px" />
          </StyledCardRow>
        </>
      )}

      {detail && detail.ceburanCard && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem' }}>
            Ceburan (diambil dari buangan):
          </Text>
          <StyledCardRow>
            <PokerCard card={detail.ceburanCard} width="3vw" maxWidth="32px" minWidth="22px" />
          </StyledCardRow>
        </>
      )}

      {detail && detail.kejeburCard && (
        <>
          <Text fontSize="0.65rem" style={{ marginBottom: 0, marginTop: '0.35rem', color: '#c0392b' }}>
            Kena kejebur{kejeburByName ? ` oleh ${kejeburByName}` : ''}:
          </Text>
          <StyledCardRow>
            <PokerCard card={detail.kejeburCard} width="3vw" maxWidth="32px" minWidth="22px" />
          </StyledCardRow>
        </>
      )}
    </StyledCard>
  );
};

export default RoundResultDetail;
