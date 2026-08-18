const config = {
  isProduction: process.env.NODE_ENV === 'production',
  contentfulSpaceId: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
  contentfulAccessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN,
  googleAnalyticsTrackingId: process.env.REACT_APP_GOOGLE_ANALYTICS_TRACKING_ID,
  // Baked in at build time. Public by nature -- it is visible in the page
  // source of every site that offers Google sign-in.
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  socketURI:
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_SERVER_URI
      : `http://${window.location.hostname}:5000/`,
};

export default config;
