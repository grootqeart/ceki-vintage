const crypto = require('crypto');
const Table = require('./Table');
const { GameError } = require('./ceki/errors');
const {
  MIN_PLAYERS,
  MAX_PLAYERS,
  VALID_TARGET_SCORES,
  ROOM_CODE_LENGTH,
  ROOM_NAME_MAX_LENGTH,
} = require('./ceki/constants');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

const MAX_PLAYERS_RANGE = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
);

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  }
  return code;
}

// Ported from the Ceki reference implementation's server/rooms/RoomManager.js,
// adapted to instantiate the Vintage Poker `Table`/`Seat` classes instead of a
// Redis-backed GameEngine, and to identify players by their authenticated
// (JWT) user id instead of a client-generated UUID -- Vintage Poker already
// has real accounts, so reconnect-by-identity falls out of the existing auth
// flow for free, with no separate localStorage playerId bookkeeping needed.
class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> room
  }

  // `hostPlayer` is an already-authenticated Player instance (see
  // server/pokergame/Player.js), built from the FETCH_LOBBY_INFO flow.
  createRoom({ hostPlayer, maxPlayers, targetScore, name }) {
    if (!hostPlayer) throw new GameError('Not authenticated');
    if (!MAX_PLAYERS_RANGE.includes(maxPlayers)) {
      throw new GameError('Invalid player count');
    }
    if (!VALID_TARGET_SCORES.includes(targetScore)) {
      throw new GameError('Invalid target score');
    }

    // A name is what people scan the lobby for, so it is trimmed, capped, and
    // stripped of control characters before anyone else ever sees it. Falling
    // back to the host's own name keeps every room findable even when the
    // field is left blank.
    const roomName =
      String(name || '')
        // Control characters would wreck the lobby layout. Escaped rather
        // than left as the literal bytes they replaced, which an editor
        // shows as nothing at all.
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, ROOM_NAME_MAX_LENGTH) || `Room ${hostPlayer.name}`;

    let code;
    do {
      code = generateRoomCode();
    } while (this.rooms.has(code));

    const table = new Table(code, `Ceki ${code}`, maxPlayers);
    table.targetScore = targetScore;
    table.sitPlayer(hostPlayer, 1);

    const room = {
      code,
      name: roomName,
      maxPlayers,
      targetScore,
      table,
      status: 'waiting', // 'waiting' | 'playing' | 'round-over' | 'minigame' | 'game-over'
      miniGame: null, // { loserSeatId, target } while a between-round tap penalty is pending
      // Tracked explicitly rather than assumed to be seat 1: the host can
      // leave, and hardcoding seat 1 left the remaining players in a room
      // nobody was allowed to start. See leaveRoom's handover.
      hostSeatId: 1,
    };
    this.rooms.set(code, room);
    return { room, seatId: 1 };
  }

  // `player` is an already-authenticated Player instance.
  joinRoom({ code, player }) {
    const room = this.rooms.get(code);
    if (!room) throw new GameError('Room not found');

    const existing = room.table.findSeatByPlayerId(player.id);
    if (existing) {
      existing.player.socketId = player.socketId;
      existing.connected = true;
      return { room, seatId: existing.id, reconnected: true };
    }

    if (room.status !== 'waiting') throw new GameError('Game already in progress');
    const seatId = room.table.nextAvailableSeatId();
    if (!seatId) throw new GameError('Room is full');

    room.table.sitPlayer(player, seatId);
    return { room, seatId, reconnected: false };
  }

  leaveRoom(code, playerId) {
    const room = this.rooms.get(code);
    if (!room) return null;
    const seat = room.table.findSeatByPlayerId(playerId);
    if (!seat) return null;
    // If the player currently owed the tap penalty leaves mid-minigame,
    // don't leave everyone else stuck waiting forever -- drop back to
    // 'round-over' so the host can hit "start" again (which recomputes who,
    // if anyone, is now the sole last place).
    if (room.miniGame && room.miniGame.loserSeatId === seat.id) {
      room.miniGame = null;
      room.status = 'round-over';
    }

    // Ask who inherits the turn while the seat still exists; apply it after.
    const nextTurnSeatId = room.table.turnAfterVacating(seat.id);

    room.table.standPlayer(seat.id);
    const remaining = room.table.activeSeats();

    if (remaining.length === 0) {
      this.rooms.delete(code);
      return null;
    }

    // Hand the host role to whoever is left, otherwise nobody can ever start
    // a round again and the room becomes unusable but undeletable.
    if (room.hostSeatId === seat.id) {
      room.hostSeatId = remaining[0].id;
    }

    if (room.status === 'playing') {
      if (remaining.length < MIN_PLAYERS) {
        // Nothing left to play against -- abandon the round rather than let
        // the last player keep drawing against themselves until the deck
        // runs out. Cumulative scores and history are kept.
        room.table.roundOver = true;
        room.status = 'waiting';
      } else if (nextTurnSeatId !== null) {
        room.table.setTurn(nextTurnSeatId);
      }
    } else if (remaining.length < MIN_PLAYERS && room.status === 'round-over') {
      // Back to the lobby screen so the host isn't offered a "next round"
      // button that startGame would only reject.
      room.status = 'waiting';
    }

    return room;
  }

  attachSocket(code, playerId, socketId) {
    const room = this.rooms.get(code);
    if (!room) return null;
    const seat = room.table.findSeatByPlayerId(playerId);
    if (!seat) return null;
    seat.player.socketId = socketId;
    seat.connected = true;
    return room;
  }

  // Marks the matching seat disconnected (does not vacate it) across all
  // rooms; used on socket 'disconnect'.
  detachSocket(socketId) {
    for (const room of this.rooms.values()) {
      const seat = room.table.findSeatBySocketId(socketId);
      if (seat) {
        seat.connected = false;
        return { room, seat };
      }
    }
    return null;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  // Rooms anyone can still walk into, for the lobby list. Only 'waiting'
  // rooms qualify -- joinRoom refuses anything else, so listing a room in
  // progress would just be an invitation to be rejected. Carries no hand or
  // seat data; the lobby only needs enough to pick one.
  listOpenRooms() {
    const open = [];
    for (const room of this.rooms.values()) {
      if (room.status !== 'waiting') continue;
      const playerCount = room.table.activeSeats().length;
      if (playerCount >= room.maxPlayers) continue;
      const host = room.table.seats[room.hostSeatId];
      open.push({
        code: room.code,
        name: room.name,
        playerCount,
        maxPlayers: room.maxPlayers,
        targetScore: room.targetScore,
        hostName: host ? host.player.name : null,
      });
    }
    // Fullest first: a room one player short of starting is the most useful
    // one to join.
    return open.sort((a, b) => b.playerCount - a.playerCount);
  }

  getRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.table.findSeatBySocketId(socketId)) return room;
    }
    return null;
  }

  // The sole seat sitting at the lowest cumulative score, or null if there's
  // a tie for last (including everyone tied at 0 before any round's played).
  _soleLastPlace(scoresBySeat, seatIds) {
    const vals = seatIds.map((id) => scoresBySeat[id] || 0);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return null;
    const losers = seatIds.filter((id) => (scoresBySeat[id] || 0) === min);
    return losers.length === 1 ? losers[0] : null;
  }

  // How many consecutive most-recent rounds had `seatId` as the sole last
  // place. Drives the escalating tap penalty (50 per consecutive round,
  // capped at 400).
  _lastPlaceStreak(room, seatId) {
    const seatIds = room.table.activeSeats().map((s) => s.id);
    const history = room.table.history;
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (this._soleLastPlace(history[i].cumulative || {}, seatIds) === seatId) streak++;
      else break;
    }
    return streak;
  }

  // Single entry point for both "start the first round" (room.status ===
  // 'waiting') and "start the next round" (room.status === 'round-over') --
  // the client's "Mulai Game" and "Mulai Ronde Berikutnya" buttons both call
  // this same action, so it dispatches on the room's current status rather
  // than requiring the client to know which phase it's in.
  startGame(code, requesterId) {
    const room = this.getRoom(code);
    if (!room) throw new GameError('Room not found');
    const hostSeat = room.table.seats[room.hostSeatId];
    if (!hostSeat || hostSeat.player.id !== requesterId) {
      throw new GameError('Only the host can start the game');
    }

    // Checked for every path, not just the first round: players can leave
    // between rounds, and the 'round-over' branch used to skip this check
    // entirely, which let a lone host start a round with nobody to play
    // against.
    if (room.table.activeSeats().length < MIN_PLAYERS) {
      throw new GameError(`Need at least ${MIN_PLAYERS} players`);
    }

    if (room.status === 'waiting') {
      // nothing further to check
    } else if (room.status === 'round-over') {
      // A single last-place player owes a tap penalty (kocok kartu) before
      // the round can start: 50 taps per consecutive last-place round,
      // capped at 400. Everyone else waits until they finish.
      const seats = room.table.activeSeats();
      const seatIds = seats.map((s) => s.id);
      const scoresBySeat = Object.fromEntries(
        seats.map((s) => [s.id, s.cumulativeScore]),
      );
      const loserSeatId = this._soleLastPlace(scoresBySeat, seatIds);
      if (loserSeatId) {
        const streak = this._lastPlaceStreak(room, loserSeatId);
        room.status = 'minigame';
        room.miniGame = { loserSeatId, target: Math.min(50 * streak, 400) };
        return room;
      }
    } else {
      throw new GameError('Game already started');
    }

    room.miniGame = null;
    room.status = 'playing';
    room.table.startRound();
    return room;
  }

  // Called once the sole last-place player has finished their tap penalty.
  completeMiniGame(code, requesterId) {
    const room = this.getRoom(code);
    if (!room) throw new GameError('Room not found');
    if (room.status !== 'minigame' || !room.miniGame) {
      throw new GameError('No mini-game in progress');
    }
    const seat = room.table.findSeatByPlayerId(requesterId);
    if (!seat || seat.id !== room.miniGame.loserSeatId) {
      throw new GameError('Only the last-place player can finish the mini-game');
    }
    // This path also deals a fresh round, so it needs the same floor as
    // startGame -- others may have left while the tap penalty was running.
    if (room.table.activeSeats().length < MIN_PLAYERS) {
      room.miniGame = null;
      room.status = 'waiting';
      throw new GameError(`Need at least ${MIN_PLAYERS} players`);
    }
    room.miniGame = null;
    room.status = 'playing';
    room.table.startRound();
    return room;
  }

  // Applies the just-ended round's result to cumulative scores (+ salip
  // rule) and moves the room to 'round-over' or 'game-over'.
  finalizeRound(room) {
    room.table.finalizeRoundScores();
    room.status = room.table.gameOver ? 'game-over' : 'round-over';
  }

  // Public-safe snapshot for lobby/scoreboard UI (no hand contents).
  getRoomSummary(room) {
    const seats = room.table.activeSeats();
    const seatIds = seats.map((s) => s.id);
    const scoresBySeat = Object.fromEntries(seats.map((s) => [s.id, s.cumulativeScore]));
    // Whoever currently sits alone at the bottom of the scoreboard -- shown
    // as a standing "🤡" badge on their avatar regardless of mini-game
    // status (null before any round's been played, or on a tie for last).
    const soleLastPlaceSeatId = this._soleLastPlace(scoresBySeat, seatIds);

    return {
      code: room.code,
      name: room.name,
      maxPlayers: room.maxPlayers,
      targetScore: room.targetScore,
      status: room.status,
      round: room.table.round,
      gameOver: room.table.gameOver,
      winnerId: room.table.winnerId,
      history: room.table.history,
      miniGame: room.miniGame || null,
      soleLastPlaceSeatId,
      players: seats.map((seat) => ({
        seatId: seat.id,
        id: seat.player.id,
        name: seat.player.name,
        isHost: seat.id === room.hostSeatId,
        connected: seat.connected,
        cumulativeScore: seat.cumulativeScore,
      })),
    };
  }
}

module.exports = RoomManager;
