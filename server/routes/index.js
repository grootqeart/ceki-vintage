const path = require('path');

const configureRoutes = (app) => {
  app.use('/api/auth', require('./api/auth'));
  app.use('/api/users', require('./api/users'));
  app.use('/api/mails', require('./api/mails'));
  app.use('/api/chips', require('./api/chips'));
  app.use('/api/rooms', require('./api/rooms'));

  // SPA fallback: express.static (mounted before configureRoutes) already
  // handles real files, so anything reaching here is a client-side route
  // (e.g. /room/ABCXYZ, /play, /dashboard). Serve index.html so React
  // Router can take over -- without this, refreshing on a deep route landed
  // on a plain-text response instead of the app, dropping the user out of
  // whatever room/page they were on.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
  });
};

module.exports = configureRoutes;
