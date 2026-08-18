const config = require('../config');
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  // Not required: an account created through Google has no password of its
  // own, and there is nothing for the user to type at a login form.
  password: {
    type: String,
  },
  // Google's stable subject id. `sparse` so the unique index only covers
  // documents that actually have one -- without it every password account
  // would collide on a missing value.
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  chipsAmount: {
    type: Number,
    default: config.INITIAL_CHIPS_AMOUNT,
  },
  type: {
    type: Number,
    default: 0,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

module.exports = User = mongoose.model('user', UserSchema);
