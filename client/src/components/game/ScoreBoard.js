import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Text from '../typography/Text';
import Button from '../buttons/Button';
import { REASON_LABEL } from './RoundResultDetail';
import Avatar from '../user/Avatar';

const POS_KEY = 'ceki:scoreboard:pos';
const DEFAULT_POS = { x: 12, y: 72 };
const WIDGET_W = 170;
const WIDGET_H = 40; // just the collapsed/header-sized footprint, for clamping

function loadStoredPos() {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_POS;
}

function clampPos(p) {
  const maxX = Math.max(0, window.innerWidth - WIDGET_W);
  const maxY = Math.max(0, window.innerHeight - WIDGET_H);
  return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
}

const StyledWidget = styled.div`
  position: fixed;
  z-index: 40;
  width: ${WIDGET_W}px;
  background-color: rgba(20, 40, 35, 0.85);
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  overflow: hidden;
  color: white;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.6rem;
  background-color: rgba(255, 255, 255, 0.08);
  cursor: move;
  touch-action: none;
  user-select: none;
`;

const StyledHeaderTitle = styled.span`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
`;

const StyledCloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
  padding: 0 0.2rem;

  &:hover {
    color: white;
  }
`;

const StyledCollapsedButton = styled.button`
  position: fixed;
  z-index: 40;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  border: none;
  background-color: rgba(20, 40, 35, 0.85);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  touch-action: none;
`;

const StyledBody = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
`;

const StyledRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  padding: 0.15rem 0;
  color: ${({ leading }) => (leading ? '#ffd54f' : 'white')};
  font-weight: ${({ leading }) => (leading ? 'bold' : 'normal')};
`;

const StyledModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const StyledModal = styled.div`
  background-color: white;
  color: #1a3c34;
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 1.25rem;
`;

const StyledModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const StyledTargetBadge = styled.span`
  font-size: 0.7rem;
  background-color: #1a3c34;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
`;

const StyledScoreRow = styled.div`
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.4rem;
  background-color: ${({ leading }) => (leading ? '#fff3cd' : '#f2f2f2')};
`;

const StyledHistoryRound = styled.div`
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.35rem 0;
  text-align: left;

  &:last-child {
    border-bottom: none;
  }
`;

// Always-visible ranking widget, pinned near the top-left corner by default
// but draggable by its header to anywhere on screen (position persists in
// localStorage across reloads): collapsible via the X button, tap the body
// to open the full scoreboard + round history modal. Ported from the Ceki
// reference's MiniScoreboard.js + ScoreBoard.js.
const ScoreBoard = ({ players, targetScore, history = [], soleLastPlaceSeatId }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pos, setPos] = useState(DEFAULT_POS);
  const dragRef = useRef(null);

  useEffect(() => {
    setPos(clampPos(loadStoredPos()));
  }, []);

  function persistPos(p) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch (e) {
      /* ignore */
    }
  }

  function handlePointerDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setPos(clampPos({ x: d.origX + dx, y: d.origY + dy }));
  }

  function handlePointerUp() {
    dragRef.current = null;
    setPos((p) => {
      persistPos(p);
      return p;
    });
  }

  const ranked = [...players].sort(
    (a, b) => (b.cumulativeScore || 0) - (a.cumulativeScore || 0),
  );
  const topScore = ranked.length ? ranked[0].cumulativeScore || 0 : 0;

  if (collapsed) {
    return (
      <StyledCollapsedButton
        type="button"
        onClick={() => setCollapsed(false)}
        title="Tampilkan peringkat"
        style={{ left: pos.x, top: pos.y }}
      >
        <span role="img" aria-label="trophy">
          {'\u{1F3C6}'}
        </span>
      </StyledCollapsedButton>
    );
  }

  return (
    <>
      <StyledWidget style={{ left: pos.x, top: pos.y }}>
        <StyledHeader
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <StyledHeaderTitle>{'⠿'} Peringkat</StyledHeaderTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <StyledHeaderTitle>
              {'\u{1F3AF}'}
              {targetScore}
            </StyledHeaderTitle>
            <StyledCloseButton
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setCollapsed(true)}
              title="Sembunyikan"
            >
              &times;
            </StyledCloseButton>
          </div>
        </StyledHeader>
        <StyledBody type="button" onClick={() => setShowModal(true)}>
          {ranked.map((p, i) => {
            const leading = i === 0 && topScore > 0;
            return (
              <StyledRow key={p.seatId} leading={leading}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Avatar
                    name={p.name}
                    size="1.1rem"
                    badge={p.seatId === soleLastPlaceSeatId ? '\u{1F921}' : null}
                    badgeLabel="last place"
                    online={p.connected}
                  />
                  {i + 1}. {p.name} {leading ? '\u{1F451}' : ''}
                </span>
                <span>{p.cumulativeScore}</span>
              </StyledRow>
            );
          })}
        </StyledBody>
      </StyledWidget>

      {showModal && (
        <StyledModalOverlay onClick={() => setShowModal(false)}>
          <StyledModal onClick={(e) => e.stopPropagation()}>
            <StyledModalHeader>
              <Text style={{ marginBottom: 0, fontWeight: 'bold', fontSize: '1.1rem' }}>Skor</Text>
              <StyledTargetBadge>Target: {targetScore}</StyledTargetBadge>
            </StyledModalHeader>

            {ranked.map((p, i) => {
              const leading = i === 0 && topScore > 0;
              const pct = Math.min(100, ((p.cumulativeScore || 0) / targetScore) * 100);
              return (
                <StyledScoreRow key={p.seatId} leading={leading}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Avatar
                        name={p.name}
                        size="1.4rem"
                        badge={p.seatId === soleLastPlaceSeatId ? '\u{1F921}' : null}
                        badgeLabel="last place"
                        online={p.connected}
                      />
                      {leading ? '\u{1F451} ' : ''}
                      {p.name}
                    </span>
                    <span>{p.cumulativeScore}</span>
                  </div>
                  <div
                    style={{
                      height: '5px',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      marginTop: '0.3rem',
                    }}
                  >
                    <div
                      style={{ height: '100%', width: `${pct}%`, backgroundColor: '#1a3c34' }}
                    />
                  </div>
                </StyledScoreRow>
              );
            })}

            <Text style={{ fontWeight: 'bold', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              Histori Ronde
            </Text>
            {history.length === 0 && <Text fontSize="0.75rem">Belum ada ronde selesai.</Text>}
            {[...history].reverse().map((h) => (
              <StyledHistoryRound key={h.round}>
                <Text fontSize="0.75rem" style={{ fontWeight: 'bold', marginBottom: '0.15rem' }}>
                  Ronde {h.round} — {REASON_LABEL[h.reason] || h.reason}
                </Text>
                {players.map((p) => {
                  const delta = h.deltas ? h.deltas[p.seatId] : undefined;
                  const cumulative = h.cumulative ? h.cumulative[p.seatId] : undefined;
                  if (delta === undefined) return null;
                  return (
                    <div
                      key={p.seatId}
                      style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}
                    >
                      <span>{p.name}</span>
                      <span>
                        {delta >= 0 ? '+' : ''}
                        {delta} ({cumulative})
                      </span>
                    </div>
                  );
                })}
              </StyledHistoryRound>
            ))}

            <Button
              secondary
              small
              fullWidth
              style={{ marginTop: '1rem' }}
              onClick={() => setShowModal(false)}
            >
              Tutup
            </Button>
          </StyledModal>
        </StyledModalOverlay>
      )}
    </>
  );
};

export default ScoreBoard;
