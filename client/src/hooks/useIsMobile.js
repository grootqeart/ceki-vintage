import { useEffect, useState } from 'react';

const QUERY = '(max-width: 900px)';

// The desktop game table layout leans on PositionedUISlot's percentage +
// CSS-transform-scale trick to fan opponents around a felt oval -- that
// combination turned out fragile on small/landscape mobile viewports (cards
// rendering invisible or badly cropped). Rather than keep patching that
// system for phones, the mobile layout is a separate, simpler flex stack;
// this hook just tells Room.js which one to render.
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  return isMobile;
}
