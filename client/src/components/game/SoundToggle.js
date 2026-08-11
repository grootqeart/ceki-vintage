import React from 'react';
import styled from 'styled-components';

const SIZE = 34;

// Mirrors the sticker picker's floating button on the opposite edge, tucked
// under the scoreboard's own corner so the three don't overlap.
const StyledButton = styled.button`
  position: fixed;
  left: 12px;
  top: ${72 + SIZE + 12}px;
  z-index: 85;
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 999px;
  border: none;
  background-color: rgba(20, 40, 35, 0.85);
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: ${({ muted }) => (muted ? 0.55 : 1)};
`;

const SoundToggle = ({ muted, onToggle }) => (
  <StyledButton
    type="button"
    muted={muted}
    onClick={onToggle}
    title={muted ? 'Bunyikan suara' : 'Matikan suara'}
    aria-label={muted ? 'Bunyikan suara' : 'Matikan suara'}
  >
    <span role="img" aria-hidden="true">
      {muted ? '\u{1F507}' : '\u{1F50A}'}
    </span>
  </StyledButton>
);

export default SoundToggle;
