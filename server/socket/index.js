const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Player = require('../pokergame/Player');
const RoomManager = require('../pokergame/RoomManager');
const { GameError } = require('../pokergame/ceki/errors');
const {
  FETCH_LOBBY_INFO,
  RECEIVE_LOBBY_INFO,
  PLAYERS_UPDATED,
  DISCONNECT,
  CREATE_ROOM,
  ROOM_CREATED,
  JOIN_ROOM,
  ROOM_JOINED,
  ROOM_UPDATED,
  LEAVE_ROOM,
  ROOM_LEFT,
  START_GAME,
  GAME_STARTED,
  DRAW_CARD,
  MELD_FROM_DISCARD,
  DISCARD_CARD,
  ANNOUNCE_CEKI,
  CLOSE_CARD,
  ROUND_ENDED,
  GAME_ENDED,
  ROOM_ERROR,
  COMPLETE_MINIGAME,
  SEND_STICKER,
  STICKER_SENT,
  MINIGAME_TAP,
  MINIGAME_PROGRESS,
  VOICE_JOIN,
  VOICE_LEAVE,
  VOICE_PEERS,
  VOICE_PEER_JOINED,
  VOICE_PEER_LEFT,
  VOICE_SIGNAL,
  VOICE_ROSTER,
} = require('../pokergame/actions');
const { STICKER_COUNT } = require('../pokergame/ceki/constants');
const config = require('../config');

const roomManager = new RoomManager();
const players = {};
// roomCode -> Set of seatIds currently on voice chat.
const voiceMembers = new Map();

function getCurrentPlayers() {
  return Object.values(players).map((player) => ({
    socketId: player.socketId,
    id: player.id,
    name: player.name,
  }));
}

const init = (socket, io) => {
  socket.on(FETCH_LOBBY_INFO, async (token) => {
    let user;

    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) console.log(err);
      else {
        user = decoded.user;
      }
    });

    if (user) {
      const found = Object.values(players).find((player) => {
        return player.id == user.id;
      });

      if (found) {
        // A previous connection for this user is still around (e.g. a page
        // refresh) -- mark whatever seat it held as disconnected rather than
        // leaving a stale live socket reference behind.
        roomManager.detachSocket(found.socketId);
        delete players[found.socketId];
      }

      user = await User.findById(user.id).select('-password');

      players[socket.id] = new Player(
        socket.id,
        String(user._id),
        user.name,
        user.chipsAmount,
      );

      socket.emit(RECEIVE_LOBBY_INFO, {
        players: getCurrentPlayers(),
        socketId: socket.id,
      });
      socket.broadcast.emit(PLAYERS_UPDATED, getCurrentPlayers());
    }
  });

  socket.on(CREATE_ROOM, ({ maxPlayers, targetScore, name }) => {
    safe(() => {
      const player = requirePlayer();
      const { room, seatId } = roomManager.createRoom({
        hostPlayer: player,
        maxPlayers,
        targetScore,
        name,
      });
      socket.join(room.code);
      socket.emit(ROOM_CREATED, {
        code: room.code,
        seatId,
        room: roomManager.getRoomSummary(room),
      });
    });
  });

  socket.on(JOIN_ROOM, ({ code }) => {
    safe(() => {
      const player = requirePlayer();
      const upperCode = (code || '').trim().toUpperCase();
      const { room, seatId } = roomManager.joinRoom({ code: upperCode, player });
      socket.join(room.code);
      socket.emit(ROOM_JOINED, {
        code: room.code,
        seatId,
        room: roomManager.getRoomSummary(room),
      });
      broadcastRoomState(room);
    });
  });

  socket.on(LEAVE_ROOM, ({ code }) => {
    safe(() => {
      const player = requirePlayer();
      const room = roomManager.leaveRoom(code, player.id);
      socket.leave(code);
      socket.emit(ROOM_LEFT, { code });
      if (room) broadcastRoomState(room);
    });
  });

  socket.on(START_GAME, ({ code }) => {
    safe(() => {
      const player = requirePlayer();
      const room = roomManager.startGame(code, player.id);
      io.to(code).emit(GAME_STARTED, { room: roomManager.getRoomSummary(room) });
      broadcastRoomState(room);
    });
  });

  socket.on(COMPLETE_MINIGAME, ({ code }) => {
    safe(() => {
      const player = requirePlayer();
      const room = roomManager.completeMiniGame(code, player.id);
      io.to(code).emit(GAME_STARTED, { room: roomManager.getRoomSummary(room) });
      broadcastRoomState(room);
    });
  });

  // Live tap count relay so everyone else waiting can watch the last-place
  // player's progress bar (and shuffle animation) tick up in real time,
  // instead of just staring at a static "please wait" screen. Purely a
  // display relay -- the server doesn't track/store this count itself, the
  // actual completion is still gated by completeMiniGame() above.
  socket.on(MINIGAME_TAP, ({ code, count }) => {
    safe(() => {
      const player = requirePlayer();
      const room = roomManager.getRoom(code);
      if (!room) throw new GameError('Room not found');
      if (room.status !== 'minigame' || !room.miniGame) {
        throw new GameError('No mini-game in progress');
      }
      const seat = room.table.findSeatByPlayerId(player.id);
      if (!seat || seat.id !== room.miniGame.loserSeatId) {
        throw new GameError('Only the last-place player can report mini-game progress');
      }
      if (!Number.isInteger(count) || count < 0 || count > room.miniGame.target) {
        throw new GameError('Invalid progress count');
      }
      io.to(code).emit(MINIGAME_PROGRESS, { count });
    });
  });

  // Purely ephemeral reaction -- no persistence, just relayed to everyone
  // currently in the room (including the sender, for immediate feedback).
  // Works in any room status (waiting, playing, between rounds), not just
  // 'playing', since it's just a fun reaction, not a game action.
  socket.on(SEND_STICKER, ({ code, stickerId }) => {
    safe(() => {
      const player = requirePlayer();
      const room = roomManager.getRoom(code);
      if (!room) throw new GameError('Room not found');
      const seat = room.table.findSeatByPlayerId(player.id);
      if (!seat) throw new GameError('You are not seated in this room');
      if (!Number.isInteger(stickerId) || stickerId < 1 || stickerId > STICKER_COUNT) {
        throw new GameError('Invalid sticker');
      }
      io.to(code).emit(STICKER_SENT, { seatId: seat.id, stickerId, ts: Date.now() });
    });
  });

  // --- Voice chat signalling ----------------------------------------------
  //
  // Pure relay. The server never sees or forwards audio -- it only passes the
  // WebRTC handshake (offer/answer/ICE) between two seats so they can open a
  // direct connection to each other. `voiceMembers` tracks who currently has
  // their mic on, per room, so a seat joining late knows who to call.

  function voiceRoster(room) {
    return Array.from(voiceMembers.get(room.code) || []);
  }

  function leaveVoice(room, seatId, { silent } = {}) {
    const members = voiceMembers.get(room.code);
    if (!members || !members.has(seatId)) return;
    members.delete(seatId);
    if (members.size === 0) voiceMembers.delete(room.code);
    if (!silent) {
      io.to(room.code).emit(VOICE_PEER_LEFT, { seatId });
      io.to(room.code).emit(VOICE_ROSTER, { seatIds: voiceRoster(room) });
    }
  }

  socket.on(VOICE_JOIN, ({ code }) => {
    safe(() => {
      const room = roomManager.getRoom(code);
      if (!room) throw new GameError('Room not found');
      const player = requirePlayer();
      const seatId = requireSeatId(room);

      // A reconnecting client comes back with a new socket id, and may send
      // this before it re-sends JOIN_ROOM. Bind the seat to the live socket
      // here rather than relying on that ordering: otherwise the seat still
      // points at the dead socket, every peer's offer is relayed into the
      // void, and the call never comes back. Both calls are idempotent.
      roomManager.attachSocket(code, player.id, socket.id);
      socket.join(code);

      if (!voiceMembers.has(code)) voiceMembers.set(code, new Set());
      const members = voiceMembers.get(code);

      // Whoever is already in gets told to expect a call; the joiner gets the
      // existing list and is the one that initiates, so both sides never try
      // to call each other at the same time (glare).
      const existing = Array.from(members).filter((id) => id !== seatId);
      members.add(seatId);

      socket.emit(VOICE_PEERS, { seatIds: existing });
      socket.to(code).emit(VOICE_PEER_JOINED, { seatId });
      io.to(code).emit(VOICE_ROSTER, { seatIds: voiceRoster(room) });
    });
  });

  socket.on(VOICE_LEAVE, ({ code }) => {
    safe(() => {
      const room = roomManager.getRoom(code);
      if (!room) return;
      const seat = room.table.findSeatByPlayerId(requirePlayer().id);
      if (!seat) return;
      leaveVoice(room, seat.id);
    });
  });

  socket.on(VOICE_SIGNAL, ({ code, toSeatId, data }) => {
    safe(() => {
      const room = roomManager.getRoom(code);
      if (!room) throw new GameError('Room not found');
      const fromSeatId = requireSeatId(room);
      const target = room.table.seats[toSeatId];
      if (!target || !target.connected || !target.player.socketId) return;
      io.to(target.player.socketId).emit(VOICE_SIGNAL, { fromSeatId, data });
    });
  });

  socket.on(DRAW_CARD, ({ code }) => {
    safe(() => {
      const room = requireActiveRoom(code);
      const seatId = requireSeatId(room);
      const outcome = room.table.drawFromDeck(seatId);
      outcome.type === 'round-ended' ? finishRound(room) : broadcastRoomState(room);
    });
  });

  socket.on(MELD_FROM_DISCARD, ({ code, count, supportingCardIds }) => {
    safe(() => {
      const room = requireActiveRoom(code);
      const seatId = requireSeatId(room);
      room.table.meldFromDiscard(seatId, count, supportingCardIds);
      broadcastRoomState(room);
    });
  });

  socket.on(DISCARD_CARD, ({ code, cardId }) => {
    safe(() => {
      const room = requireActiveRoom(code);
      const seatId = requireSeatId(room);
      const outcome = room.table.discardCard(seatId, cardId);
      outcome.type === 'round-ended' ? finishRound(room) : broadcastRoomState(room);
    });
  });

  socket.on(ANNOUNCE_CEKI, ({ code }) => {
    safe(() => {
      const room = requireActiveRoom(code);
      const seatId = requireSeatId(room);
      room.table.announceCeki(seatId);
      broadcastRoomState(room);
    });
  });

  socket.on(CLOSE_CARD, ({ code, source, cardId }) => {
    safe(() => {
      const room = requireActiveRoom(code);
      const seatId = requireSeatId(room);
      const outcome =
        source === 'leftover'
          ? room.table.closeWithLeftover(seatId, cardId)
          : room.table.closeCard(seatId, source, cardId);
      outcome.type === 'round-ended' ? finishRound(room) : broadcastRoomState(room);
    });
  });

  socket.on(DISCONNECT, () => {
    delete players[socket.id];
    const found = roomManager.detachSocket(socket.id);
    if (found) {
      // Otherwise a dropped player lingers in the voice roster forever and
      // everyone keeps a dead peer connection open for them.
      leaveVoice(found.room, found.seat.id);
      broadcastRoomState(found.room);
    }

    socket.broadcast.emit(PLAYERS_UPDATED, getCurrentPlayers());
  });

  function requirePlayer() {
    const player = players[socket.id];
    if (!player) throw new GameError('Not authenticated');
    return player;
  }

  function requireSeatId(room) {
    const player = requirePlayer();
    const seat = room.table.findSeatByPlayerId(player.id);
    if (!seat) throw new GameError('You are not seated in this room');
    return seat.id;
  }

  function requireActiveRoom(code) {
    const room = roomManager.getRoom(code);
    if (!room || room.status !== 'playing') {
      throw new GameError('No active round');
    }
    return room;
  }

  function safe(handler) {
    try {
      handler();
    } catch (err) {
      const message = err instanceof GameError ? err.message : 'Unexpected server error';
      if (!(err instanceof GameError)) console.error(err);
      socket.emit(ROOM_ERROR, { message });
    }
  }

  function broadcastRoomState(room) {
    const summary = roomManager.getRoomSummary(room);
    for (const seat of room.table.activeSeats()) {
      if (!seat.connected || !seat.player.socketId) continue;
      io.to(seat.player.socketId).emit(ROOM_UPDATED, {
        room: summary,
        game: room.table.toClientState(seat.id),
      });
    }
  }

  function finishRound(room) {
    io.to(room.code).emit(ROUND_ENDED, { result: room.table.result });
    roomManager.finalizeRound(room);
    if (room.status === 'game-over') {
      io.to(room.code).emit(GAME_ENDED, {
        winnerId: room.table.winnerId,
      });
    }
    broadcastRoomState(room);
  }
};

module.exports = { init, roomManager };
