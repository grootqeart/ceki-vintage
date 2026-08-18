import { createClient } from 'contentful';
import config from '../clientConfig';

// Returns null when no Contentful space is configured, rather than building a
// client that cannot work.
//
// createClient throws outright on a missing space or accessToken, and this
// runs during render -- so with no credentials the whole React tree died
// before it could mount, leaving the index.html splash screen on screen
// forever. That is what a deploy without REACT_APP_CONTENTFUL_* looked like:
// a page stuck on the logo, with a healthy server behind it.
//
// The app ships a local snapshot of the content (context/content/
// localizedContent.json) and is meant to run without live credentials, so a
// missing space is a normal configuration, not an error.
const useContentful = () => {
  if (!config.contentfulSpaceId || !config.contentfulAccessToken) return null;

  return createClient({
    space: config.contentfulSpaceId,
    accessToken: config.contentfulAccessToken,
  });
};

export default useContentful;
