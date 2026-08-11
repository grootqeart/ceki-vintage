import React from 'react';
import styled, { keyframes } from 'styled-components';
import Button from '../buttons/Button';

const blink = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(1.08);
  }
`;

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
`;

const StyledBlinkingButton = styled(Button)`
  animation: ${blink} 1s ease-in-out infinite;
`;

// Only renders the (attention-grabbing, blinking) call-to-action for
// announcing Ceki. Once already announced, this renders nothing -- that
// state is shown as a small inline badge next to "Tangan saya" instead (see
// Room.js), since a full-width blinking button is just a notification at
// that point and shouldn't keep eating vertical space on your own side.
const CekiButton = ({ eligible, announced, onAnnounce }) => {
  if (announced || !eligible) return null;

  return (
    <StyledWrapper>
      <StyledBlinkingButton primary small onClick={onAnnounce}>
        Ceki!
      </StyledBlinkingButton>
    </StyledWrapper>
  );
};

export default CekiButton;
