import React, { useContext, useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import roomContext from '../context/room/roomContext';
import gameContext from '../context/game/gameContext';
import socketContext from '../context/websocket/socketContext';
import Container from '../components/layout/Container';
import Text from '../components/typography/Text';
import Heading from '../components/typography/Heading';
import Button from '../components/buttons/Button';
import Hand from '../components/game/Hand';
import MeldTable from '../components/game/MeldTable';
import TableCenter from '../components/game/TableCenter';
import CekiButton from '../components/game/CekiButton';
import CekiActionBar from '../components/game/CekiActionBar';
import RoundStatus from '../components/game/RoundStatus';
import { RotateDevicePrompt } from '../components/game/RotateDevicePrompt';
import OpponentPanel from '../components/game/OpponentPanel';
import DealAnimation from '../components/game/DealAnimation';
import RotatedFeltTable from '../components/game/RotatedFeltTable';
import LoserMiniGame from '../components/game/LoserMiniGame';
import MiniGameWatchBar from '../components/game/MiniGameWatchBar';
import StickerPicker from '../components/game/StickerPicker';
import StickerBubble from '../components/game/StickerBubble';
import Avatar from '../components/user/Avatar';
import ScoreBoard from '../components/game/ScoreBoard';
import RoundResultDetail, { REASON_LABEL } from '../components/game/RoundResultDetail';
import PokerTable from '../components/game/PokerTable';
import { PokerTableWrapper } from '../components/game/PokerTableWrapper';
import { PositionedUISlot } from '../components/game/PositionedUISlot';
import { findPerfectPartition, findClosablePartition } from '../pokergame/ceki/combinations';
import useIsMobile from '../hooks/useIsMobile';

const OPPONENT_SLOTS = [
  { top: '-5%', left: '0', origin: 'top left' },
  { top: '-8%', left: '50%', origin: 'top center', style: { transform: 'translateX(-50%)' } },
  { top: '-5%', right: '0', origin: 'top right' },
];

// Mobile (portrait, rotated-table) opponent positions -- pinned to distinct
// corners near the top of the felt rather than a plain side-by-side row, so
// it reads as seats around a table instead of a stacked list.
const MOBILE_OPPONENT_SLOTS_BY_COUNT = {
  1: [{ top: '2%', left: '50%', transform: 'translateX(-50%)', align: 'center' }],
  // These offsets place the CARD STACK -- the name label is floated out of
  // flow (see OpponentPanel) and hangs further out past the table, so it no
  // longer pushes the cards inward. Sitting the stack flush with the table
  // box puts it over the outer trim, clear of the felt's inner blue ring.
  2: [
    { top: '30%', left: '0%', align: 'left' },
    { top: '30%', right: '0%', align: 'right' },
  ],
  3: [
    { top: '30%', left: '0%', align: 'left' },
    { top: '0%', left: '50%', transform: 'translateX(-50%)', align: 'center' },
    { top: '30%', right: '0%', align: 'right' },
  ],
};

const Room = () => {
  const { code: urlCode } = useParams();
  const history = useHistory();
  const {
    room,
    code,
    seatId,
    isHost,
    startGame,
    leaveRoom,
    joinRoom,
    completeMiniGame,
    stickers,
    sendSticker,
    miniGameProgress,
    reportMiniGameProgress,
    error,
    clearError,
  } = useContext(roomContext);
  const { socketId } = useContext(socketContext);
  const {
    game,
    roundResult,
    drawCard,
    meldFromDiscard,
    discardCard,
    announceCeki,
    closeCard,
  } = useContext(gameContext);
  const isMobile = useIsMobile();

  const [selectedCardId, setSelectedCardId] = useState(null);
  const [takeDepth, setTakeDepth] = useState(null);
  const [supportSelection, setSupportSelection] = useState([]);
  const [ceburanCandidateIds, setCeburanCandidateIds] = useState(null);
  const [ceburanLeftoverId, setCeburanLeftoverId] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [dealPhase, setDealPhase] = useState(null);
  const armDealAnimRef = useRef(false);

  // Join the room from a shared link / page refresh if we're not already in
  // it. Gated on `socketId` (set only once the server's FETCH_LOBBY_INFO
  // handler has finished authenticating this socket and replied), not just
  // `socket` existing -- socket.io delivers events in order, but the server
  // processes FETCH_LOBBY_INFO asynchronously (a DB lookup), so a JOIN_ROOM
  // emitted right after the socket connects can reach the server before that
  // lookup finishes, getting rejected with "Not authenticated". Waiting for
  // socketId (the FETCH_LOBBY_INFO round-trip) guarantees the server already
  // knows this socket before we ask it to join a room.
  useEffect(() => {
    if (socketId && urlCode && code !== urlCode.toUpperCase()) {
      joinRoom(urlCode.toUpperCase());
    }
    // eslint-disable-next-line
  }, [urlCode, socketId, code]);

  // Reset per-turn selection state whenever the round advances.
  useEffect(() => {
    setSelectedCardId(null);
    setTakeDepth(null);
    setSupportSelection([]);
    setCeburanCandidateIds(null);
    setCeburanLeftoverId(null);
    // eslint-disable-next-line
  }, [game && game.turnSeatId, game && game.myHand && game.myHand.length]);

  // Server-side validation failures (invalid meld, "must be a run first",
  // not your turn, etc.) arrive as ROOM_ERROR and land in `error`, but
  // previously only the pre-room connection screen ever rendered it -- any
  // rejected in-game action (like a bad discard-pile take) failed completely
  // silently. Auto-dismiss after a few seconds so it doesn't linger forever.
  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => clearError(), 4000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  // Trigger the shuffle+deal animation only when we actually *watched* the
  // room leave 'waiting'/'round-over' into 'playing' during this session --
  // never on a page refresh/reconnect that lands directly in 'playing',
  // since in that case the round may already be well underway.
  useEffect(() => {
    const status = room && room.status;
    if (status === 'waiting' || status === 'round-over') {
      armDealAnimRef.current = true;
    }
    // eslint-disable-next-line
  }, [room && room.status]);

  useEffect(() => {
    const status = room && room.status;
    if (status === 'playing' && game && armDealAnimRef.current) {
      armDealAnimRef.current = false;
      setDealPhase('animating');
    }
    // eslint-disable-next-line
  }, [room && room.status, game && game.round]);

  const goToLobby = () => {
    leaveRoom();
    history.push('/play');
  };

  // Most recent active sticker reaction for a given seat, or null. Multiple
  // could theoretically overlap in `stickers` briefly; showing just the
  // latest keeps a single seat's bubble simple.
  const latestStickerForSeat = (sid) => {
    const matches = stickers.filter((s) => s.seatId === sid);
    return matches.length ? matches[matches.length - 1] : null;
  };

  // Shares/copies a direct join link (`/room/:code`) rather than just the
  // bare code -- the route already auto-joins on load (see the socketId
  // effect above), so a teammate can just tap the link instead of typing
  // the code in by hand. Prefers the native share sheet on mobile, where
  // available, falling back to clipboard copy everywhere else.
  const handleShareRoomLink = async () => {
    const shareUrl = `${window.location.origin}/room/${room.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Room Ceki Online — ${room.code}`,
          text: `Yuk gabung room Ceki saya, kode: ${room.code}`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled the share sheet -- nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      // Clipboard API unavailable/denied -- the code is still shown as text.
    }
  };

  const errorToast = error && room && (
    <div
      role="alert"
      onClick={clearError}
      style={{
        position: 'fixed',
        top: '0.75rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        background: '#c0392b',
        color: 'white',
        padding: '0.5rem 1rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        maxWidth: '90vw',
        textAlign: 'center',
      }}
    >
      {error}
    </div>
  );

  if (!room) {
    return (
      <Container
        fullHeight
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        {error ? (
          <>
            <Text textAlign="center" style={{ color: 'red' }}>
              {error}
            </Text>
            <Text textAlign="center">
              Room mungkin sudah tidak ada (server sempat direstart) atau kode salah.
            </Text>
            <Button secondary small onClick={() => history.push('/play')}>
              Kembali ke Lobby
            </Button>
          </>
        ) : (
          <Text>Menghubungkan ke room...</Text>
        )}
      </Container>
    );
  }

  const mySeatId = seatId;

  if (room.status === 'waiting') {
    return (
      <Container
        fullHeight
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding="6rem 2rem 2rem 2rem"
      >
        {errorToast}
        <Heading as="h2" textCentered>
          Room {room.code}
        </Heading>
        <Text textAlign="center">
          Bagikan kode ini ke teman: <strong>{room.code}</strong>
        </Text>
        <Button secondary small onClick={handleShareRoomLink}>
          {linkCopied ? 'Link tersalin!' : 'Bagikan Link Room'}
        </Button>
        <Text textAlign="center">
          {room.players.length} / {room.maxPlayers} pemain -- target skor{' '}
          {room.targetScore}
        </Text>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {room.players.map((p) => {
            const activeSticker = latestStickerForSeat(p.seatId);
            return (
              <li
                key={p.seatId}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar name={p.name} size="1.8rem" online={p.connected} />
                  {activeSticker && (
                    <StickerBubble key={activeSticker.key} stickerId={activeSticker.stickerId} />
                  )}
                </div>
                <span>
                  {p.name}
                  {p.isHost ? ' (host)' : ''}
                  {!p.connected ? ' -- terputus' : ''}
                </span>
              </li>
            );
          })}
        </ul>
        <StickerPicker onSend={sendSticker} />
        {isHost && room.players.length >= 2 && (
          <Button primary onClick={startGame}>
            Mulai Game
          </Button>
        )}
        {isHost && room.players.length < 2 && (
          <Text textAlign="center">
            Menunggu pemain lain bergabung (minimal 2)...
          </Text>
        )}
        <Button secondary small onClick={goToLobby}>
          Keluar
        </Button>
      </Container>
    );
  }

  if (room.status === 'minigame' && room.miniGame) {
    const isLoser = mySeatId === room.miniGame.loserSeatId;
    if (isLoser) {
      return (
        <LoserMiniGame
          target={room.miniGame.target}
          onDone={completeMiniGame}
          onProgress={reportMiniGameProgress}
        />
      );
    }
    const loser = room.players.find((p) => p.seatId === room.miniGame.loserSeatId);
    return (
      <Container
        fullHeight
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding="6rem 2rem 2rem 2rem"
      >
        {errorToast}
        <Heading as="h2" textCentered>
          <span role="img" aria-label="clown">
            {'\u{1F921}'}
          </span>{' '}
          Menunggu {loser ? loser.name : 'pemain terakhir'} kocok kartu...
        </Heading>
        <MiniGameWatchBar count={miniGameProgress} target={room.miniGame.target} />
        <Text textAlign="center">
          Dia peringkat terakhir, jadi harus kocok kartu dulu sebelum ronde berikutnya dimulai.
        </Text>
        <Button secondary small onClick={goToLobby}>
          Keluar
        </Button>
      </Container>
    );
  }

  if (room.status === 'round-over' || room.status === 'game-over') {
    const winner = room.players.find((p) => p.seatId === room.winnerId);
    const ranked = [...room.players].sort(
      (a, b) => (b.cumulativeScore || 0) - (a.cumulativeScore || 0),
    );
    // `game.result` is part of the persistently-synced room state (survives
    // refresh/reconnect); `roundResult` only ever arrives via the one-time
    // ROUND_ENDED broadcast, which a client that reconnected after the round
    // already ended would have missed entirely -- prefer game.result so the
    // breakdown still shows up in that case.
    const lastResult = (game && game.result) || roundResult;

    return (
      <Container
        fullHeight
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        padding="6rem 2rem 2rem 2rem"
      >
        {errorToast}
        {room.status === 'game-over' ? (
          <>
            <Text textAlign="center" style={{ fontSize: '3rem', marginBottom: 0 }}>
              <span role="img" aria-label="trophy">
                🏆
              </span>
            </Text>
            <Heading as="h2" textCentered>
              {winner ? `${winner.name} Menang!` : 'Game Selesai'}
            </Heading>
            <Text textAlign="center">Target skor {room.targetScore} tercapai</Text>
            <div style={{ width: '100%', maxWidth: '360px', margin: '1rem 0' }}>
              {ranked.map((p, i) => (
                <div
                  key={p.seatId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.9rem',
                    marginBottom: '0.4rem',
                    borderRadius: '999px',
                    fontWeight: i === 0 ? 'bold' : 'normal',
                    backgroundColor: i === 0 ? '#f6e58d' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                      <Avatar
                        name={p.name}
                        size="1.6rem"
                        badge={p.seatId === room.soleLastPlaceSeatId ? '\u{1F921}' : null}
                        badgeLabel="last place"
                        online={p.connected}
                      />
                      {(() => {
                        const activeSticker = latestStickerForSeat(p.seatId);
                        return (
                          activeSticker && (
                            <StickerBubble
                              key={activeSticker.key}
                              stickerId={activeSticker.stickerId}
                            />
                          )
                        );
                      })()}
                    </div>
                    {i === 0 ? '\u{1F451} ' : ''}
                    {p.name}
                  </span>
                  <span>{p.cumulativeScore}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Heading as="h2" textCentered>
              Ronde Selesai
            </Heading>
            {lastResult && (
              <Text textAlign="center">
                {REASON_LABEL[lastResult.reason] || lastResult.reason}
              </Text>
            )}
            <div style={{ width: '100%', maxWidth: '420px' }}>
              {lastResult && lastResult.details
                ? room.players.map((p) => (
                    <RoundResultDetail
                      key={p.seatId}
                      player={p}
                      players={room.players}
                      score={(lastResult.scores && lastResult.scores[p.seatId]) || 0}
                      detail={lastResult.details[p.seatId]}
                    />
                  ))
                : room.players.map((p) => (
                    <Text key={p.seatId} textAlign="center">
                      {p.name}: {p.cumulativeScore}
                    </Text>
                  ))}
            </div>
            <Text textAlign="center" style={{ marginTop: '0.5rem' }}>
              Skor saat ini: {ranked.map((p) => `${p.name} ${p.cumulativeScore}`).join(' | ')}
            </Text>
            {isHost && (
              <Button primary onClick={startGame}>
                Mulai Ronde Berikutnya
              </Button>
            )}
            {!isHost && (
              <Text textAlign="center">Menunggu host memulai ronde berikutnya...</Text>
            )}
          </>
        )}

        <StickerPicker onSend={sendSticker} />
        <Button secondary small onClick={goToLobby}>
          Keluar
        </Button>
      </Container>
    );
  }

  if (!game) {
    return (
      <Container
        fullHeight
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <Text>Memuat permainan...</Text>
      </Container>
    );
  }

  const myHand = game.myHand || [];
  const me = room.players.find((p) => p.seatId === mySeatId);
  const opponents = room.players.filter((p) => p.seatId !== mySeatId);
  const isMyTurn = game.turnSeatId === mySeatId;
  const isDealing = dealPhase === 'animating';

  const cekiAnnounced = !!(game.ceki && game.ceki[mySeatId]);
  const cekiEligible = !!(game.cekiEligible && game.cekiEligible[mySeatId]);
  const discardUnlocked = !!(
    game.discardMeldUnlocked && game.discardMeldUnlocked[mySeatId]
  );
  const jokerHandIds = myHand.filter((c) => c.isJoker).map((c) => c.id);
  const selectedIsJoker = selectedCardId && jokerHandIds.includes(selectedCardId);

  // Optimistic hint only (server is authoritative): "Tutup!" should only
  // show when setting the selected card aside as the tutupan would actually
  // leave a perfect meld partition -- otherwise the button just leads to a
  // confusing server rejection for a card that could never close anything.
  const selectedCanClose =
    !!selectedCardId &&
    (() => {
      const idx = myHand.findIndex((c) => c.id === selectedCardId);
      if (idx === -1) return false;
      const rest = myHand.slice(0, idx).concat(myHand.slice(idx + 1));
      try {
        return !!findPerfectPartition(rest);
      } catch (e) {
        return false;
      }
    })();

  // Optimistic hint only (server is authoritative): the "Ceburan!" button
  // should only show when the top discard card would actually complete your
  // hand (used inside a meld, with the rest forming a perfect partition) --
  // not just whenever the discard pile happens to be non-empty. Otherwise
  // the button appears on every turn once you've announced Ceki even when
  // nobody actually discarded the card you needed.
  const topDiscardCard = game.discardPile.length
    ? game.discardPile[game.discardPile.length - 1]
    : null;
  const canCloseCeburan =
    isMyTurn &&
    cekiAnnounced &&
    !game.hasDrawnThisTurn &&
    !!topDiscardCard &&
    (() => {
      try {
        const trial = [...myHand, topDiscardCard];
        return !!(
          findClosablePartition(trial, topDiscardCard.id) || findPerfectPartition(trial)
        );
      } catch (e) {
        return false;
      }
    })();

  const handleDraw = () => drawCard();

  const handleDiscard = () => {
    if (selectedCardId) {
      discardCard(selectedCardId);
      setSelectedCardId(null);
    }
  };

  const handleMeld = () => {
    if (takeDepth && supportSelection.length >= 2) {
      meldFromDiscard(takeDepth, supportSelection);
      setTakeDepth(null);
      setSupportSelection([]);
    }
  };

  const toggleSupport = (cardId) => {
    setSupportSelection((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  };

  const handleCancelMeld = () => {
    setTakeDepth(null);
    setSupportSelection([]);
  };

  const handleCloseLeftover = () => {
    if (selectedCardId) {
      closeCard('leftover', selectedCardId);
      setSelectedCardId(null);
    }
  };

  const handleCloseDeck = () => closeCard('deck');

  // A ceburan can have more than one valid tutupan (leftover) card -- rather
  // than silently auto-picking one for the player, find every hand card that
  // would work as the leftover (mirrors the server's per-card check) and let
  // the player choose when there's more than one option. If there's only one
  // valid choice (or none, e.g. the rare 0-leftover case the server itself
  // rejects with a clearer error), skip straight to confirming.
  const handleCloseCeburan = () => {
    if (!topDiscardCard) return;
    const candidates = myHand
      .filter((c) => {
        const rest = myHand.filter((x) => x.id !== c.id).concat([topDiscardCard]);
        try {
          return !!findPerfectPartition(rest);
        } catch (e) {
          return false;
        }
      })
      .map((c) => c.id);

    if (candidates.length <= 1) {
      closeCard('discard', candidates[0]);
      return;
    }
    setCeburanCandidateIds(candidates);
    setCeburanLeftoverId(null);
  };

  const handleConfirmCeburan = () => {
    if (!ceburanLeftoverId) return;
    closeCard('discard', ceburanLeftoverId);
    setCeburanCandidateIds(null);
    setCeburanLeftoverId(null);
  };

  const handleCancelCeburan = () => {
    setCeburanCandidateIds(null);
    setCeburanLeftoverId(null);
  };

  // On mobile, the hand should sit right under the table (as in the
  // reference layout) rather than after the CekiButton/MeldTable/hint text
  // block -- that extra block used to sit between the table and the hand,
  // pushing the hand (and the scroll point needed to see it) further down.
  // Defined once here and placed in a different order per layout below;
  // only one of the two placements ever actually renders at a time (mobile
  // XOR desktop), so reusing the same element reference is safe.
  const preHandInfo = (
    <>
      {!isDealing && isMyTurn && !game.hasDrawnThisTurn && !takeDepth && (
        <Text textAlign="center" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
          Ketuk kartu di deck untuk ambil, atau ketuk kartu buangan yang kamu butuhkan (kartu di
          atasnya ikut terambil, maks. 7 kartu).
        </Text>
      )}

      {!isDealing && (
        <CekiButton eligible={cekiEligible} announced={cekiAnnounced} onAnnounce={announceCeki} />
      )}

      <MeldTable melds={game.tableMelds[mySeatId] || []} label="Melds saya" />

      {isDealing && (
        <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
          <Text textAlign="center">Mengocok kartu...</Text>
        </div>
      )}
    </>
  );

  return (
    <Container
      fullHeight
      flexDirection="column"
      alignItems="center"
      padding={isMobile ? '2.75rem 0.5rem 0.5rem 0.5rem' : '5rem 1rem 1rem 1rem'}
    >
      {!isMobile && <RotateDevicePrompt />}
      {errorToast}
      <RoundStatus game={game} mySeatId={mySeatId} players={room.players} />
      <ScoreBoard
        players={room.players}
        targetScore={room.targetScore}
        history={room.history}
        soleLastPlaceSeatId={room.soleLastPlaceSeatId}
      />

      {isMobile ? (
        // Portrait-first mobile layout -- phones are much taller than wide
        // in their natural orientation, so rather than fight for landscape
        // (cramped, ~375-430px of height) this stacks vertically in the
        // roomier portrait dimension instead. The felt table art itself is
        // a wide oval, rotated 90deg to match (see RotatedFeltTable.js).
        <RotatedFeltTable>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 0.5rem 1rem',
              boxSizing: 'border-box',
            }}
          >
            {isDealing && <DealAnimation onComplete={() => setDealPhase(null)} />}

            {opponents.map((p, idx) => {
              const slots =
                MOBILE_OPPONENT_SLOTS_BY_COUNT[opponents.length] ||
                MOBILE_OPPONENT_SLOTS_BY_COUNT[3];
              const slot = slots[idx] || slots[0];
              const activeSticker = latestStickerForSeat(p.seatId);
              // Only the side seats run vertically -- the top seat spans the
              // table's width, where a sideways name and a downward card
              // stack would just waste height.
              return (
                <div
                  key={p.seatId}
                  style={{
                    position: 'absolute',
                    top: slot.top,
                    left: slot.left,
                    right: slot.right,
                    transform: slot.transform,
                  }}
                >
                  <OpponentPanel
                    player={p}
                    handCount={game.handCounts[p.seatId] || 0}
                    melds={game.tableMelds[p.seatId] || []}
                    isTurn={game.turnSeatId === p.seatId}
                    ceki={!!(game.ceki && game.ceki[p.seatId])}
                    isLastPlace={p.seatId === room.soleLastPlaceSeatId}
                    flat
                    vertical={slot.align !== 'center'}
                    align={slot.align}
                    compactMelds
                  />
                  {activeSticker && (
                    <StickerBubble key={activeSticker.key} stickerId={activeSticker.stickerId} />
                  )}
                </div>
              );
            })}

            <TableCenter
              pile={game.discardPile}
              drawPileCount={game.drawPileCount}
              canDrawDeck={!isDealing && isMyTurn && !game.hasDrawnThisTurn && !takeDepth}
              onDrawDeck={handleDraw}
              canPick={!isDealing && isMyTurn && !game.hasDrawnThisTurn}
              pendingCount={takeDepth}
              onPickDepth={(d) => {
                setTakeDepth(d);
                setSupportSelection([]);
              }}
              selectedIds={supportSelection}
              onToggleId={toggleSupport}
              removedJokerCount={(game.removedJokers || []).length}
              vertical
            />
          </div>
        </RotatedFeltTable>
      ) : (
        <PokerTableWrapper style={{ minHeight: '55vh', maxWidth: '900px' }}>
          <PokerTable />

          {isDealing && <DealAnimation onComplete={() => setDealPhase(null)} />}

          {opponents.map((p, idx) => {
            const slot = OPPONENT_SLOTS[idx] || OPPONENT_SLOTS[0];
            const activeSticker = latestStickerForSeat(p.seatId);
            return (
              <React.Fragment key={p.seatId}>
                <PositionedUISlot
                  top={slot.top}
                  left={slot.left}
                  right={slot.right}
                  scale="0.55"
                  origin={slot.origin}
                  style={slot.style}
                >
                  <OpponentPanel
                    player={p}
                    handCount={game.handCounts[p.seatId] || 0}
                    melds={game.tableMelds[p.seatId] || []}
                    isTurn={game.turnSeatId === p.seatId}
                    ceki={!!(game.ceki && game.ceki[p.seatId])}
                    isLastPlace={p.seatId === room.soleLastPlaceSeatId}
                  />
                </PositionedUISlot>
                {/* Rendered as its own unscaled slot (not inside the 0.55x
                    scaled panel above) so the sticker always shows at a
                    consistent, legible size regardless of the panel's
                    responsive scale-down. Anchored to the same corner the
                    panel scales toward, so it lands close to the avatar. */}
                {activeSticker && (
                  <PositionedUISlot top={slot.top} left={slot.left} right={slot.right} origin={slot.origin}>
                    <div style={{ position: 'relative', width: '2rem', height: '2rem' }}>
                      <StickerBubble key={activeSticker.key} stickerId={activeSticker.stickerId} />
                    </div>
                  </PositionedUISlot>
                )}
              </React.Fragment>
            );
          })}

          <PositionedUISlot
            width="100%"
            origin="center center"
            scale="0.7"
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <TableCenter
              pile={game.discardPile}
              drawPileCount={game.drawPileCount}
              canDrawDeck={!isDealing && isMyTurn && !game.hasDrawnThisTurn && !takeDepth}
              onDrawDeck={handleDraw}
              canPick={!isDealing && isMyTurn && !game.hasDrawnThisTurn}
              pendingCount={takeDepth}
              onPickDepth={(d) => {
                setTakeDepth(d);
                setSupportSelection([]);
              }}
              selectedIds={supportSelection}
              onToggleId={toggleSupport}
              removedJokerCount={(game.removedJokers || []).length}
            />
          </PositionedUISlot>
        </PokerTableWrapper>
      )}

      {!isMobile && preHandInfo}

      {/* On mobile the hand is pulled up so it sits ON the felt's lower half
          (matching the reference mockup) instead of starting below the
          table -- the table is tall enough in portrait that a hand placed
          strictly after it lands off-screen and needs scrolling. Negative
          margin (rather than absolutely positioning it inside
          RotatedFeltTable) keeps the cards outside the table's overflow
          clip, so a tall/overlapping hand can never get cut off. */}
      <div
        style={
          isMobile
            ? {
                marginTop: '-7rem',
                position: 'relative',
                zIndex: 20,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }
            : { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }
        }
      >
      {!isDealing && (ceburanCandidateIds ? (
        <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
          <Text textAlign="center">
            Ceburan {topDiscardCard && `(${topDiscardCard.rank || 'Joker'}${topDiscardCard.suit || ''})`} bisa ditutup dengan lebih dari satu cara -- pilih kartu tanganmu yang jadi
            tutupan:
          </Text>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
            <Button secondary small onClick={handleCancelCeburan}>
              Batal
            </Button>
            <Button primary small disabled={!ceburanLeftoverId} onClick={handleConfirmCeburan}>
              Konfirmasi Ceburan
            </Button>
          </div>
        </div>
      ) : takeDepth ? (
        <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
          <Text textAlign="center">
            Pilih minimal 2 kartu pendukung dari tanganmu (kartu ikut terambil bisa dipilih
            langsung di tumpukan buangan di atas):
          </Text>
          {!discardUnlocked && (
            <Text textAlign="center" style={{ color: '#b8860b', fontSize: '0.75rem' }}>
              Ambilan pertamamu dari buangan harus berupa run (kartu berurutan), kecuali
              kombinasinya mengandung As.
            </Text>
          )}
          <Button secondary small onClick={handleCancelMeld}>
            Batal
          </Button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            {me && (
              <div style={{ position: 'relative' }}>
                <Avatar name={me.name} size="1.4rem" />
                {(() => {
                  const activeSticker = latestStickerForSeat(mySeatId);
                  return (
                    activeSticker && (
                      <StickerBubble key={activeSticker.key} stickerId={activeSticker.stickerId} />
                    )
                  );
                })()}
              </div>
            )}
            <Text textAlign="center" style={{ marginBottom: 0 }}>
              Tangan saya:
              {cekiAnnounced && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: '#0a8f4c',
                  }}
                >
                  CEKI!{' '}
                  <span role="img" aria-label="checked">
                    ✔
                  </span>
                </span>
              )}
            </Text>
          </div>
          {selectedIsJoker && (
            <Text textAlign="center" style={{ color: '#b8860b' }}>
              Kartu ini Joker -- "Buang Kartu" menyingkirkannya dari permainan (-100 di akhir
              ronde); "Tutup!" (kalau tanganmu jadi) menghitungnya sebagai tutupan (+100).
            </Text>
          )}
        </>
      ))}

      {/* One persistent Hand instance across mode toggling -- mounting a
          second, separate <Hand> for each picking view used to reset the
          manual drag-sort the player had already done (each <Hand> keeps
          its own internal order state from a fresh mount), which looked
          like the hand order randomly changing. Hidden (not unmounted) while
          dealing so the real hand doesn't flash in before the deal
          animation's placeholder finishes. */}
      <div style={{ display: isDealing ? 'none' : undefined }}>
        <Hand
          cards={myHand}
          sortable={!takeDepth && !ceburanCandidateIds}
          selectedIds={
            ceburanCandidateIds
              ? ceburanLeftoverId
                ? [ceburanLeftoverId]
                : []
              : takeDepth
              ? supportSelection
              : selectedCardId
              ? [selectedCardId]
              : []
          }
          onToggle={
            ceburanCandidateIds
              ? (cardId) => setCeburanLeftoverId((prev) => (prev === cardId ? null : cardId))
              : takeDepth
              ? toggleSupport
              : (cardId) => setSelectedCardId((prev) => (prev === cardId ? null : cardId))
          }
          disabledCardIds={
            ceburanCandidateIds
              ? myHand.filter((c) => !ceburanCandidateIds.includes(c.id)).map((c) => c.id)
              : []
          }
          disabled={!isMyTurn}
        />
      </div>
      </div>

      {isMobile && preHandInfo}

      {!isDealing && (
        <CekiActionBar
          canDiscard={isMyTurn && game.hasDrawnThisTurn && !!selectedCardId}
          onDiscard={handleDiscard}
          canMeld={
            isMyTurn && !game.hasDrawnThisTurn && !!takeDepth && supportSelection.length >= 2
          }
          onMeld={handleMeld}
          canCloseLeftover={
            isMyTurn && cekiAnnounced && game.hasDrawnThisTurn && selectedCanClose
          }
          onCloseLeftover={handleCloseLeftover}
          canCloseDeck={
            isMyTurn && cekiAnnounced && !game.hasDrawnThisTurn && !ceburanCandidateIds
          }
          onCloseDeck={handleCloseDeck}
          canCloseCeburan={canCloseCeburan && !ceburanCandidateIds}
          onCloseCeburan={handleCloseCeburan}
        />
      )}
      {!isDealing && <StickerPicker onSend={sendSticker} />}
    </Container>
  );
};

export default Room;
