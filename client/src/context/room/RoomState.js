import React, { useState, useEffect, useContext, useRef } from 'react';
import { withRouter } from 'react-router-dom';
import {
  CREATE_ROOM,
  ROOM_CREATED,
  JOIN_ROOM,
  ROOM_JOINED,
  ROOM_UPDATED,
  LEAVE_ROOM,
  ROOM_LEFT,
  START_GAME,
  GAME_STARTED,
  ROOM_ERROR,
  COMPLETE_MINIGAME,
  SEND_STICKER,
  STICKER_SENT,
  MINIGAME_TAP,
  MINIGAME_PROGRESS,
} from '../../pokergame/actions';
import socketContext from '../websocket/socketContext';
import RoomContext from './roomContext';

// How long a sticker bubble stays on screen. Exported so the sound engine can
// cut a reaction clip that outlasts its own bubble.
export const STICKER_DURATION_MS = 5000;

const RoomState = ({ history, children }) => {
  const { socket } = useContext(socketContext);

  const [room, setRoom] = useState(null);
  const [code, setCode] = useState(null);
  const [seatId, setSeatId] = useState(null);
  const [error, setError] = useState(null);
  const [stickers, setStickers] = useState([]);
  const stickerKeyRef = useRef(0);
  const [miniGameProgress, setMiniGameProgress] = useState(0);
  const miniGameKeyRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleEntered = ({ code, seatId, room }) => {
      setCode(code);
      setSeatId(seatId);
      setRoom(room);
      history.push(`/room/${code}`);
    };
    const handleRoomUpdate = ({ room }) => {
      setRoom(room);
      // Reset the visible tap progress whenever a *new* mini-game instance
      // starts (including re-entering 'minigame' for the same player a few
      // rounds later) -- but not on every unrelated ROOM_UPDATED broadcast
      // during the same instance (e.g. another player's tab reconnecting),
      // which would otherwise yank everyone's progress bar back to 0.
      const key =
        room && room.miniGame
          ? `${room.miniGame.loserSeatId}-${room.miniGame.target}-${room.status}`
          : null;
      if (key !== miniGameKeyRef.current) {
        miniGameKeyRef.current = key;
        setMiniGameProgress(0);
      }
    };
    const handleLeft = () => {
      setRoom(null);
      setCode(null);
      setSeatId(null);
      history.push('/play');
    };
    const handleError = ({ message }) => setError(message);
    // Purely ephemeral -- each sticker auto-removes itself after its bubble
    // has had time to show, no history is kept.
    const handleSticker = ({ seatId, stickerId, ts }) => {
      const key = `${ts}-${stickerKeyRef.current++}`;
      setStickers((prev) => [...prev, { key, seatId, stickerId, ts }]);
      setTimeout(() => {
        setStickers((prev) => prev.filter((s) => s.key !== key));
      }, STICKER_DURATION_MS);
    };
    const handleMiniGameProgress = ({ count }) => setMiniGameProgress(count);

    socket.on(ROOM_CREATED, handleEntered);
    socket.on(ROOM_JOINED, handleEntered);
    socket.on(ROOM_UPDATED, handleRoomUpdate);
    socket.on(GAME_STARTED, handleRoomUpdate);
    socket.on(ROOM_LEFT, handleLeft);
    socket.on(ROOM_ERROR, handleError);
    socket.on(STICKER_SENT, handleSticker);
    socket.on(MINIGAME_PROGRESS, handleMiniGameProgress);

    return () => {
      socket.off(ROOM_CREATED, handleEntered);
      socket.off(ROOM_JOINED, handleEntered);
      socket.off(ROOM_UPDATED, handleRoomUpdate);
      socket.off(GAME_STARTED, handleRoomUpdate);
      socket.off(ROOM_LEFT, handleLeft);
      socket.off(ROOM_ERROR, handleError);
      socket.off(STICKER_SENT, handleSticker);
      socket.off(MINIGAME_PROGRESS, handleMiniGameProgress);
    };
    // eslint-disable-next-line
  }, [socket]);

  const createRoom = (maxPlayers, targetScore) => {
    socket && socket.emit(CREATE_ROOM, { maxPlayers, targetScore });
  };

  const joinRoom = (joinCode) => {
    socket && socket.emit(JOIN_ROOM, { code: joinCode });
  };

  const leaveRoom = () => {
    socket && code && socket.emit(LEAVE_ROOM, { code });
  };

  const startGame = () => {
    socket && code && socket.emit(START_GAME, { code });
  };

  const completeMiniGame = () => {
    socket && code && socket.emit(COMPLETE_MINIGAME, { code });
  };

  const sendSticker = (stickerId) => {
    socket && code && socket.emit(SEND_STICKER, { code, stickerId });
  };

  const reportMiniGameProgress = (count) => {
    socket && code && socket.emit(MINIGAME_TAP, { code, count });
  };

  const clearError = () => setError(null);

  const isHost = !!(
    room &&
    room.players.find((p) => p.seatId === seatId && p.isHost)
  );

  return (
    <RoomContext.Provider
      value={{
        room,
        code,
        seatId,
        isHost,
        error,
        stickers,
        miniGameProgress,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        completeMiniGame,
        sendSticker,
        reportMiniGameProgress,
        clearError,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export default withRouter(RoomState);
