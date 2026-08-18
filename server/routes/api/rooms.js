const express = require('express');
const router = express.Router();
const { roomManager } = require('../../socket');

// Lobby listing: rooms still waiting for players. Searching happens on the
// client -- the list is small (rooms live in memory and vanish when empty),
// so filtering server-side would only add a round-trip per keystroke.
router.get('/', (req, res) => {
  res.json({ rooms: roomManager.listOpenRooms() });
});

// Lets a shareable-link landing page (/room/:code) show "room not found" /
// "room full" before the client opens a socket connection and joins.
router.get('/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const room = roomManager.getRoom(code);

  if (!room) {
    return res.json({ exists: false });
  }

  res.json({
    exists: true,
    status: room.status,
    playerCount: room.table.activeSeats().length,
    maxPlayers: room.maxPlayers,
  });
});

module.exports = router;
