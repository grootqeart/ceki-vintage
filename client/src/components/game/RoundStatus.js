import React from 'react';
import styled from 'styled-components';
import Text from '../typography/Text';

const StyledStatus = styled.div`
  text-align: center;
  padding: 0.5rem;
`;

const END_REASON_LABEL = {
  'closed-tutupan': 'Tutup dengan tutupan!',
  'closed-ceburan': 'Tutup dengan ceburan!',
  'closed-meja': 'Semua kartu naik ke meja!',
  'deck-empty': 'Kartu di deck habis.',
  'joker-discarded': 'Joker terbuang -- ronde batal!',
};

const RoundStatus = ({ game, mySeatId, players }) => {
  if (!game) return null;

  const nameOf = (seatId) => {
    const p = players && players.find((pl) => pl.seatId === Number(seatId));
    return p ? p.name : `Kursi ${seatId}`;
  };

  if (game.roundOver && game.endReason) {
    return (
      <StyledStatus>
        <Text textAlign="center">
          <strong>{END_REASON_LABEL[game.endReason] || game.endReason}</strong>
        </Text>
      </StyledStatus>
    );
  }

  const isMyTurn = game.turnSeatId === mySeatId;

  return (
    <StyledStatus>
      <Text textAlign="center">
        {isMyTurn
          ? game.hasDrawnThisTurn
            ? 'Giliranmu -- buang satu kartu.'
            : 'Giliranmu -- ambil kartu dari deck atau buangan.'
          : `Menunggu giliran ${nameOf(game.turnSeatId)}...`}
      </Text>
    </StyledStatus>
  );
};

export default RoundStatus;
