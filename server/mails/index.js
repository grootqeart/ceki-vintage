const MainLayout = require('./layout/MainLayout');
const WelcomeMailContent = require('./mails/WelcomeMail');

const WelcomeMail = (username = '{{nickname}}') => ({
  id: 1,
  name: '001 | Registration Welcome',
  subject: 'Welcome to Ceki Online!',
  text: ((username) =>
    `Hi ${username}!\n\nWelcome to Ceki Online and thank you for registering to our service!\n\nPlay now: https://www.vintagepoker.net \n\nEnjoy playing on our platform!\n\nThe Ceki Online Team
    `)(username),
  html: ((username) =>
    `${MainLayout(
      'Welcome to Ceki Online',
      username,
      WelcomeMailContent(),
    )}`)(username),
});

module.exports = {
  WelcomeMail,
};
