import React, { useContext, useEffect, useState } from 'react';
import {
  DRAW_CARD,
  MELD_FROM_DISCARD,
  DISCARD_CARD,
  ANNOUNCE_CEKI,
  CLOSE_CARD,
  ROOM_UPDATED,
  GAME_STARTED,
  ROUND_ENDED,
  GAME_ENDED,
} from '../../pokergame/actions';
import socketContext from '../websocket/socketContext';
import roomContext from '../room/roomContext';
import GameContext from './gameContext';

const GameState = ({ children }) => {
  const { socket } = useContext(socketContext);
  const { code } = useContext(roomContext);

  const [game, setGame] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameOverInfo, setGameOverInfo] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = ({ game }) => {
      setGame(game);
      if (game && !game.result) setRoundResult(null);
    };
    const handleGameStarted = () => {
      setRoundResult(null);
      setGameOverInfo(null);
    };
    const handleRoundEnded = ({ result }) => setRoundResult(result);
    const handleGameEnded = (info) => setGameOverInfo(info);

    socket.on(ROOM_UPDATED, handleRoomUpdate);
    socket.on(GAME_STARTED, handleGameStarted);
    socket.on(ROUND_ENDED, handleRoundEnded);
    socket.on(GAME_ENDED, handleGameEnded);

    return () => {
      socket.off(ROOM_UPDATED, handleRoomUpdate);
      socket.off(GAME_STARTED, handleGameStarted);
      socket.off(ROUND_ENDED, handleRoundEnded);
      socket.off(GAME_ENDED, handleGameEnded);
    };
    // eslint-disable-next-line
  }, [socket]);

  const drawCard = () => {
    socket && code && socket.emit(DRAW_CARD, { code });
  };

  const meldFromDiscard = (count, supportingCardIds) => {
    socket &&
      code &&
      socket.emit(MELD_FROM_DISCARD, { code, count, supportingCardIds });
  };

  const discardCard = (cardId) => {
    socket && code && socket.emit(DISCARD_CARD, { code, cardId });
  };

  const announceCeki = () => {
    socket && code && socket.emit(ANNOUNCE_CEKI, { code });
  };

  const closeCard = (source, cardId) => {
    socket && code && socket.emit(CLOSE_CARD, { code, source, cardId });
  };

  return (
    <GameContext.Provider
      value={{
        game,
        roundResult,
        gameOverInfo,
        drawCard,
        meldFromDiscard,
        discardCard,
        announceCeki,
        closeCard,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameState;
