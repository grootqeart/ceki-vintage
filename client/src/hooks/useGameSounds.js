import { useEffect, useRef } from 'react';
import { STICKER_DURATION_MS } from '../context/room/RoomState';

// Fires sound effects off changes in the game state rather than from inside
// each action handler. Two reasons: the handlers only know about the local
// player's own moves, so hooking them would leave opponents' turns silent;
// and the server is the authority, so reacting to the state it broadcasts
// means a sound only plays for something that actually happened -- a rejected
// action stays quiet on its own.
export default function useGameSounds({ game, mySeatId, play, error, stickers }) {
  const prev = useRef(null);
  const prevError = useRef(null);
  const seenStickers = useRef(new Set());

  useEffect(() => {
    if (!game) return;

    const snapshot = {
      round: game.round,
      drawPileCount: game.drawPileCount,
      discardCount: (game.discardPile || []).length,
      turnSeatId: game.turnSeatId,
      roundOver: game.roundOver,
    };

    const before = prev.current;
    prev.current = snapshot;

    if (!before) return; // first state we ever see: nothing to compare against

    // A new round reshuffles everything at once -- the deck refills and the
    // discard pile empties. Those aren't player actions, so announce the deal
    // and skip the per-action comparisons for this update.
    if (snapshot.round !== before.round) {
      play('deal');
      return;
    }

    if (snapshot.drawPileCount < before.drawPileCount) play('cardDraw');

    if (snapshot.discardCount > before.discardCount) play('cardDiscard');
    else if (snapshot.discardCount < before.discardCount) play('pileTake');

    // Only when the turn actually lands on this player, not on every state
    // update that happens while it is already theirs.
    if (
      !snapshot.roundOver &&
      snapshot.turnSeatId === mySeatId &&
      before.turnSeatId !== mySeatId
    ) {
      play('turn');
    }
  }, [game, mySeatId, play]);

  useEffect(() => {
    if (error && error !== prevError.current) play('error');
    prevError.current = error;
  }, [error, play]);

  // Each send carries a unique key, so tracking which ones have already been
  // heard keeps a re-render from replaying stickers that are still on screen
  // -- the bubbles linger for seconds after arriving.
  useEffect(() => {
    if (!stickers || !stickers.length) return;
    const live = new Set(stickers.map((s) => s.key));
    for (const s of stickers) {
      if (seenStickers.current.has(s.key)) continue;
      seenStickers.current.add(s.key);
      // Some reaction clips run longer than the bubble they belong to, which
      // would leave audio playing for a sticker that has already vanished.
      play([`sticker${s.stickerId}`, 'sticker'], { maxMs: STICKER_DURATION_MS });
    }
    // Stickers remove themselves once their bubble expires; drop them from
    // the seen set at the same time so it can't grow without bound.
    seenStickers.current.forEach((key) => {
      if (!live.has(key)) seenStickers.current.delete(key);
    });
  }, [stickers, play]);
}
