import React from 'react';
import styled from 'styled-components';

// A pleasant, card-table-themed palette. The same name always maps to the
// same color (simple string hash), so avatars stay consistent across
// sessions without needing any stored avatar data.
const PALETTE = [
  '#6297B5',
  '#B5626C',
  '#B58E62',
  '#628E62',
  '#8E62B5',
  '#B5A362',
  '#62A3B5',
  '#B57C62',
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

const StyledWrapper = styled.div`
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
`;

const StyledAvatar = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: 50%;
  background-color: ${({ bg }) => bg};
  color: white;
  font-weight: bold;
  font-family: ${(props) => props.theme.fonts.fontFamilySansSerif};
  font-size: ${({ size }) => `calc(${size} * 0.42)`};
  line-height: 1;
  user-select: none;
`;

const StyledBadge = styled.span`
  position: absolute;
  bottom: -15%;
  right: -15%;
  font-size: ${({ size }) => `calc(${size} * 0.55)`};
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
`;

// Connection indicator, top-right so it never collides with `badge` (which
// sits bottom-right). Floored at 6px because the portrait table renders
// avatars as small as 1.15rem, where a purely proportional dot would be too
// small to read. The white ring keeps it legible against both the felt and
// the avatar's own colour.
const StyledStatusDot = styled.span`
  position: absolute;
  top: -4%;
  right: -4%;
  width: max(6px, calc(${({ size }) => size} * 0.3));
  height: max(6px, calc(${({ size }) => size} * 0.3));
  border-radius: 50%;
  background-color: ${({ online }) => (online ? '#22c55e' : '#9ca3af')};
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
`;

// Auto-generated avatar: initials over a deterministic color, derived purely
// from the player's name -- no upload/storage needed, works instantly for
// every existing account. `badge` overlays a small emoji in the corner (e.g.
// the last-place clown) -- purely decorative, no title/label text.
// `online`: pass a boolean to show a green/grey connection dot; omit it
// entirely (undefined) where connection state isn't known or isn't relevant,
// and no dot is drawn.
const Avatar = ({ name, size = '2rem', style, badge, badgeLabel, online }) => {
  const bg = PALETTE[hashString(name || '') % PALETTE.length];
  return (
    <StyledWrapper style={style}>
      <StyledAvatar bg={bg} size={size} title={name}>
        {initialsOf(name)}
      </StyledAvatar>
      {online !== undefined && (
        <StyledStatusDot
          size={size}
          online={online}
          title={online ? 'Online' : 'Terputus'}
          aria-label={online ? 'online' : 'terputus'}
        />
      )}
      {badge && (
        <StyledBadge size={size} role="img" aria-label={badgeLabel || 'badge'}>
          {badge}
        </StyledBadge>
      )}
    </StyledWrapper>
  );
};

export default Avatar;
