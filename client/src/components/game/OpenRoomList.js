import React, { useCallback, useEffect, useState } from 'react';
import Axios from 'axios';
import styled from 'styled-components';
import Text from '../typography/Text';

const REFRESH_MS = 8000;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
  max-height: 15rem;
  overflow-y: auto;
`;

const StyledRow = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: ${(props) => props.theme.other.stdBorderRadius};
  background: rgba(255, 255, 255, 0.55);
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  font-family: ${(props) => props.theme.fonts.fontFamilySansSerif};

  &:hover {
    background: rgba(255, 255, 255, 0.85);
  }
`;

const StyledName = styled.span`
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledMeta = styled.span`
  font-size: 0.7rem;
  opacity: 0.7;
`;

const StyledCount = styled.span`
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: bold;
  background: rgba(20, 40, 35, 0.85);
  color: #fff;
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
`;

// Lists rooms still waiting for players and lets one be joined with a tap.
// Polls rather than pushing over the socket: this is a lobby, seconds of
// staleness cost nothing, and rooms appear and vanish constantly.
const OpenRoomList = ({ query, onJoin }) => {
  const [rooms, setRooms] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await Axios.get('/api/rooms');
      setRooms(res.data.rooms || []);
      setFailed(false);
    } catch (e) {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (failed) return <Text textAlign="center">Tidak bisa memuat daftar room.</Text>;
  if (rooms === null) return <Text textAlign="center">Memuat daftar room...</Text>;

  const needle = query.trim().toLowerCase();
  // Matching the code too means the search box doubles as the join-by-code
  // field for anyone who was handed a code rather than a link.
  const shown = needle
    ? rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.code.toLowerCase().includes(needle) ||
          (r.hostName || '').toLowerCase().includes(needle),
      )
    : rooms;

  if (!rooms.length) {
    return <Text textAlign="center">Belum ada room terbuka. Buat satu di atas!</Text>;
  }
  if (!shown.length) {
    return <Text textAlign="center">Tidak ada room yang cocok dengan "{query}".</Text>;
  }

  return (
    <StyledList>
      {shown.map((r) => (
        <StyledRow key={r.code} type="button" onClick={() => onJoin(r.code)}>
          <span style={{ minWidth: 0 }}>
            <StyledName>{r.name}</StyledName>
            <br />
            <StyledMeta>
              {r.code} &middot; target {r.targetScore}
              {r.hostName ? ` · host ${r.hostName}` : ''}
            </StyledMeta>
          </span>
          <StyledCount>
            {r.playerCount}/{r.maxPlayers}
          </StyledCount>
        </StyledRow>
      ))}
    </StyledList>
  );
};

export default OpenRoomList;
