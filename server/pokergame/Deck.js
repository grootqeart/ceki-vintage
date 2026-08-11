const lodash = require('lodash');
const { JOKER_COUNT } = require('./ceki/constants');

class Deck {
  constructor() {
    this.suits = ['s', 'h', 'd', 'c'];
    this.ranks = [
      'A',
      'K',
      'Q',
      'J',
      '10',
      '9',
      '8',
      '7',
      '6',
      '5',
      '4',
      '3',
      '2',
    ];
    this.cards = this.createDeckAndShuffle();
  }

  createDeckAndShuffle() {
    let cards = [];

    this.suits.forEach((suit) => {
      this.ranks.forEach((rank) => {
        cards.push({ id: `${suit}${rank}`, suit, rank, isJoker: false });
      });
    });

    for (let i = 1; i <= JOKER_COUNT; i++) {
      cards.push({ id: `joker${i}`, suit: 'joker', rank: null, isJoker: true });
    }

    for (let i = 0; i <= 7; i++) {
      cards = lodash.shuffle(cards);
    }

    return cards;
  }

  count() {
    return this.cards.length;
  }

  draw() {
    const count = this.count();
    if (count > 0)
      return this.cards.splice(Math.floor(Math.random() * count), 1)[0];
    else return null;
  }
}

module.exports = Deck;
