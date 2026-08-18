const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');

const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.status(200).json(user);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Internal server error');
  }
};

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
exports.login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ errors: [{ msg: 'Invalid credentials' }] });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_TOKEN_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Internal server error' });
  }
};

// @route   POST api/auth/google
// @desc    Sign in (or sign up) with a Google ID token
// @access  Public
//
// The client never sends us a password here -- it sends the ID token Google
// handed it, and we verify that token's signature and audience against
// Google directly. Trusting the email in the token without verifying it
// would let anyone sign in as anyone.
//
// Everything downstream is unchanged: this issues exactly the same JWT the
// password login does, so sockets, reconnect and the game itself neither
// know nor care how the user got here.
exports.googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ errors: [{ msg: 'Missing Google credential' }] });
  }
  if (!config.GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID is not set -- Google sign-in cannot be verified');
    return res.status(500).json({ errors: [{ msg: 'Google sign-in is not configured' }] });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Google will happily issue a token for an address the user has not
    // proved they own; treating that as identity would be a way in.
    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ errors: [{ msg: 'Email Google belum terverifikasi' }] });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    // Match on the Google id first, then fall back to the email so someone
    // who already registered with a password can sign in with Google and
    // land on the same account rather than a duplicate.
    let user = await User.findOne({ googleId });
    if (!user) user = await User.findOne({ email });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      user = new User({
        name: await uniqueNameFrom(payload.name || email.split('@')[0]),
        email,
        googleId,
      });
      await user.save();
    }

    const jwtPayload = { user: { id: user.id } };
    return jwt.sign(
      jwtPayload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_TOKEN_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      },
    );
  } catch (err) {
    console.error('Google sign-in failed:', err.message);
    return res.status(401).json({ errors: [{ msg: 'Verifikasi Google gagal' }] });
  }
};

// Display names are unique in this schema, and Google names are not -- two
// people called "Budi" would collide and the second sign-in would fail with
// a database error. Append a number until the name is free.
async function uniqueNameFrom(rawName) {
  const base = String(rawName).trim().slice(0, 20) || 'Pemain';
  let candidate = base;
  for (let n = 2; await User.exists({ name: candidate }); n++) {
    candidate = `${base}${n}`;
    if (n > 999) return `${base}${Date.now()}`;
  }
  return candidate;
}
