const config = {
  isProduction: process.env.NODE_ENV === 'production',
  contentfulSpaceId: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
  contentfulAccessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN,
  googleAnalyticsTrackingId: process.env.REACT_APP_GOOGLE_ANALYTICS_TRACKING_ID,
  // Committed default, same reasoning as the server's copy in server/config.js:
  // the id is public, and relying on the host to pass it through at build time
  // is a failure mode that silently removes the sign-in button. An environment
  // variable still wins if one is set.
  googleClientId:
    process.env.REACT_APP_GOOGLE_CLIENT_ID ||
    '706018926108-r3uib4sqkqfu23pr1fon5dc7q8b4ps1s.apps.googleusercontent.com',
  socketURI:
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_SERVER_URI
      : `http://${window.location.hostname}:5000/`,
};

export default config;
