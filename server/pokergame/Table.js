const Seat = require('./Seat');
const round = require('./ceki/round');

class Table {
  constructor(id, name, maxPlayers = 4) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.seats = this.initSeats(maxPlayers);

    // Round state (see server/pokergame/ceki/round.js for the state machine
    // that reads/writes these fields).
    this.deck = null;
    this.turn = null; // seatId of the active player
    this.roundOver = true;
    this.endReason = null; // 'closed-tutupan' | 'closed-ceburan' | 'closed-meja' | 'deck-empty' | 'joker-discarded'
    this.result = null; // { closerId, scores, details } once a round ends
    this.discardPile = [];
    this.discardBy = {}; // cardId -> seatId, for the kejebur penalty
    this.winMessages = [];
    this.history = [];
    this.round = 0;
    this.targetScore = 500; // host-selectable at room creation (500 or 1000)
    this.gameOver = false;
    this.winnerId = null; // seatId of the game winner once gameOver
  }

  initSeats(maxPlayers) {
    const seats = {};

    for (let i = 1; i <= maxPlayers; i++) {
      seats[i] = null;
    }

    return seats;
  }

  nextAvailableSeatId() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      if (!this.seats[i]) return i;
    }
    return null;
  }

  sitPlayer(player, seatId) {
    if (this.seats[seatId]) {
      return;
    }
    this.seats[seatId] = new Seat(seatId, player);
  }

  standPlayer(seatId) {
    this.seats[seatId] = null;
  }

  // Marks a seat as disconnected rather than vacating it -- Ceki rooms are
  // small, fixed groups for the duration of a game, so the round simply
  // waits for the player to reconnect instead of dropping their seat.
  removePlayer(socketId) {
    const seat = this.findSeatBySocketId(socketId);
    if (seat) seat.connected = false;
  }

  findSeatBySocketId(socketId) {
    return Object.values(this.seats).find(
      (seat) => seat && seat.player.socketId === socketId,
    );
  }

  findSeatByPlayerId(playerId) {
    return Object.values(this.seats).find(
      (seat) => seat && seat.player.id === playerId,
    );
  }

  activeSeats() {
    return round.activeSeats(this);
  }

  // See round.turnAfterVacating -- ask before removing a seat, apply after.
  turnAfterVacating(seatId) {
    return round.turnAfterVacating(this, seatId);
  }

  setTurn(seatId) {
    round.setTurn(this, seatId);
  }

  startRound(startSeatId) {
    const seatId = startSeatId || round.pickStartingSeat(this);
    round.startRound(this, seatId);
  }

  drawFromDeck(seatId) {
    return round.drawFromDeck(this, seatId);
  }

  meldFromDiscard(seatId, count, supportingCardIds) {
    return round.meldFromDiscard(this, seatId, count, supportingCardIds);
  }

  discardCard(seatId, cardId) {
    return round.discardCard(this, seatId, cardId);
  }

  announceCeki(seatId) {
    return round.announceCeki(this, seatId);
  }

  closeWithLeftover(seatId, cardId) {
    return round.closeWithLeftover(this, seatId, cardId);
  }

  closeCard(seatId, source, cardId) {
    return round.closeCard(this, seatId, source, cardId);
  }

  // Applies the just-ended round's result to cumulative scores (+ the salip
  // house rule) and checks for a game winner against targetScore. Call once
  // after a round-ending action returns { type: 'round-ended', ... }.
  finalizeRoundScores() {
    round.applyRoundResultToScores(this);
  }

  toClientState(viewerSeatId) {
    return round.toClientState(this, viewerSeatId);
  }
}

module.exports = Table;
