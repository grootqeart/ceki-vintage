import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import STICKERS from '../../assets/stickers/stickers';

// Pops up above whatever it's anchored next to (an avatar), holds briefly,
// then fades out -- purely decorative, no interaction. Mount/unmount is
// driven by the caller (see RoomState.js's `stickers` list, each entry
// auto-removes itself after STICKER_DURATION_MS).
const pop = keyframes`
  0% { transform: translate(-50%, 6px) scale(0.4); opacity: 0; }
  6% { transform: translate(-50%, 0) scale(1.15); opacity: 1; }
  10% { transform: translate(-50%, 0) scale(1); opacity: 1; }
  90% { transform: translate(-50%, 0) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -10px) scale(0.85); opacity: 0; }
`;

const StyledBubble = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  margin-bottom: 0.4rem;
  width: 92px;
  height: 92px;
  z-index: 80;
  animation: ${pop} 5s ease-out forwards;
  pointer-events: none;

  img {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    display: block;
  }
`;

const StickerBubble = ({ stickerId }) => {
  const sticker = STICKERS[stickerId];
  // Browsers share a single decode/animation timeline across every <img>
  // pointing at the exact same GIF resource (the picker thumbnail, a prior
  // bubble, etc.) -- a freshly mounted <img src={sticker.src}> would just
  // pick up whatever frame that shared timeline is already on instead of
  // starting over. Fetching a brand new blob URL per mount gives this
  // instance its own independent resource, so the animation always restarts
  // from frame 0.
  const [freshSrc, setFreshSrc] = useState(null);

  useEffect(() => {
    if (!sticker) return undefined;
    let cancelled = false;
    let objectUrl = null;
    fetch(sticker.src)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setFreshSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFreshSrc(sticker.src);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sticker]);

  if (!sticker) return null;
  return (
    <StyledBubble>
      {freshSrc && <img src={freshSrc} alt={sticker.label} />}
    </StyledBubble>
  );
};

export default StickerBubble;
