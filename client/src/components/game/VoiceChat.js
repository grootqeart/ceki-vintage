import React from 'react';
import styled from 'styled-components';

const SIZE = 34;

const StyledWrapper = styled.div`
  position: fixed;
  left: 12px;
  top: ${72 + (SIZE + 12) * 2}px;
  z-index: 85;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
`;

const StyledButton = styled.button`
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 999px;
  border: none;
  background-color: ${({ active }) => (active ? '#0a8f4c' : 'rgba(20, 40, 35, 0.85)')};
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: ${({ dimmed }) => (dimmed ? 0.55 : 1)};
`;

const StyledCount = styled.span`
  font-size: 0.6rem;
  color: #fff;
  background: rgba(20, 40, 35, 0.85);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  white-space: nowrap;
`;

const StyledError = styled.span`
  font-size: 0.6rem;
  color: #fff;
  background: rgba(150, 30, 30, 0.9);
  border-radius: 6px;
  padding: 0.15rem 0.35rem;
  max-width: 45vw;
`;

// Two controls: join/leave the call, and mute your own mic once on it.
// Deliberately opt-in -- the mic is never opened until the player asks.
const VoiceChat = ({ joined, connecting, micMuted, roster, error, onJoin, onLeave, onToggleMic }) => (
  <StyledWrapper>
    <StyledButton
      type="button"
      active={joined}
      dimmed={connecting}
      onClick={joined ? onLeave : onJoin}
      title={joined ? 'Keluar dari voice chat' : 'Gabung voice chat'}
      aria-label={joined ? 'Keluar dari voice chat' : 'Gabung voice chat'}
    >
      <span role="img" aria-hidden="true">
        {connecting ? '\u{231B}' : joined ? '\u{260E}' : '\u{1F4DE}'}
      </span>
    </StyledButton>

    {joined && (
      <StyledButton
        type="button"
        dimmed={micMuted}
        onClick={onToggleMic}
        title={micMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
        aria-label={micMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
      >
        <span role="img" aria-hidden="true">
          {micMuted ? '\u{1F507}' : '\u{1F3A4}'}
        </span>
      </StyledButton>
    )}

    {joined && <StyledCount>{roster.length} lawan bicara</StyledCount>}
    {error && <StyledError>{error}</StyledError>}
  </StyledWrapper>
);

export default VoiceChat;
