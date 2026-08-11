class Seat {
  constructor(id, player) {
    this.id = id;
    this.player = player;
    this.sittingOut = false;
    this.connected = true;

    // Ceki round state
    this.hand = [];
    this.tableMelds = []; // melds taken from the discard pile, laid face-up (public)
    this.turn = false;
    this.cekiAnnounced = false;
    this.cekiEligible = false;
    this.hasDrawnThisTurn = false;
    this.discardMeldUnlocked = false; // first discard-pile take must be a run (unless Ace set)
    this.cumulativeScore = 0;
  }

  receiveCard(card) {
    this.hand.push(card);
  }

  discard(cardId) {
    const idx = this.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) return null;
    return this.hand.splice(idx, 1)[0];
  }

  resetForNewRound() {
    this.hand = [];
    this.tableMelds = [];
    this.turn = false;
    this.cekiAnnounced = false;
    this.cekiEligible = false;
    this.hasDrawnThisTurn = false;
    this.discardMeldUnlocked = false;
  }
}

module.exports = Seat;
