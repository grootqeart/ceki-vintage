const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { validationResult } = require('express-validator');
const { WelcomeMail } = require('../mails');
const User = require('../models/User');
const sendEmail = require('../helpers/sendMail');

// @route   POST api/users
// @desc    Register User
// @access  Public
exports.register = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Both are unique, and the old code answered "Invalid credentials" for
    // either -- which reads as "wrong password" on a registration form and
    // told the player nothing about what to change. Signing in with Google
    // creates an account too, so hitting this by registering with an address
    // already used that way is easy.
    //
    // This does confirm whether an address is registered. For a game played
    // among friends, a player who cannot tell why the form keeps failing is
    // the worse problem.
    if (await User.findOne({ email })) {
      return res.status(400).json({
        errors: [
          {
            msg: 'Email ini sudah terdaftar. Coba login, atau masuk dengan Google.',
          },
        ],
      });
    }

    if (await User.findOne({ name })) {
      return res.status(400).json({
        errors: [{ msg: 'Nickname ini sudah dipakai. Pilih yang lain.' }],
      });
    }

    let user;

    user = new User({ name, email, password });

    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(password, salt);

    await user.save();

    try {
      await sendEmail(user.email, WelcomeMail(user.name));
    } catch (error) {
      console.log(error);
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
        return res.json({ token });
      },
    );
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
};
