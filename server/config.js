const dotenv = require('dotenv');

// Load env vars if env is not production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: './server/config/local.env' });
}

// The OAuth client id is public: it is visible in the page source of every
// site that offers Google sign-in, and this flow uses no client secret. It is
// committed as the default rather than left to an environment variable
// because a host that fails to propagate the variable takes Google sign-in
// down with a message no player can act on -- which is exactly what happened
// on the first deploy. An environment variable still overrides it, so a fork
// can point at its own OAuth client without touching this file.
const DEFAULT_GOOGLE_CLIENT_ID =
  '706018926108-r3uib4sqkqfu23pr1fon5dc7q8b4ps1s.apps.googleusercontent.com';

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  MONGO_URI: process.env.MONGO_URI,
  NODE_ENV: process.env.NODE_ENV,
  INITIAL_CHIPS_AMOUNT: 30000,
  JWT_TOKEN_EXPIRES_IN: 3600000 * 24,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PW: process.env.SMTP_PW,
  FROM_NAME: 'Ceki Online Info',
  FROM_EMAIL: 'no-reply@ceki-online.app',
};
