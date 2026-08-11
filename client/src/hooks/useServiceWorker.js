import { useEffect } from 'react';
import * as serviceWorker from '../serviceWorker';

// Unregistered (not register()'d) while this app is under active iteration
// -- a registered service worker caches the app shell and silently serves
// the STALE build on reload until its own update-check fires, which made
// "hard refresh" on a phone look like it did nothing even after a fresh
// deploy. Revisit once the app is stable and PWA offline support is
// actually wanted (OfflineProvider's "update available" modal is dormant
// until then, since no update will ever be detected).
const useServiceWorker = () => {
  useEffect(() => {
    serviceWorker.unregister();
  }, []);

  return [() => window.location.reload()];
};

export default useServiceWorker;
