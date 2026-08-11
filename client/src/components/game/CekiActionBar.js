import React from 'react';
import styled from 'styled-components';
import Button from '../buttons/Button';

const StyledBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem;
`;

const CekiActionBar = ({
  canDiscard,
  onDiscard,
  canMeld,
  onMeld,
  canCloseLeftover,
  onCloseLeftover,
  canCloseCeburan,
  onCloseCeburan,
}) => (
  <StyledBar>
    {canDiscard && (
      <Button primary small onClick={onDiscard}>
        Buang Kartu
      </Button>
    )}
    {canMeld && (
      <Button secondary small onClick={onMeld}>
        Gabung ke Meja
      </Button>
    )}
    {canCloseLeftover && (
      <Button primary small onClick={onCloseLeftover}>
        <span role="img" aria-label="target">
          🎯
        </span>{' '}
        Tutup!
      </Button>
    )}
    {canCloseCeburan && (
      <Button primary small onClick={onCloseCeburan}>
        <span role="img" aria-label="target">
          🎯
        </span>{' '}
        Ceburan!
      </Button>
    )}
  </StyledBar>
);

export default CekiActionBar;
