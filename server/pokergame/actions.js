exports.FOLD = 'FOLD';
exports.CHECK = 'CHECK';
exports.CALL = 'CALL';
exports.RAISE = 'RAISE';
exports.WINNER = 'WINNER';
exports.FETCH_LOBBY_INFO = 'FETCH_LOBBY_INFO';
exports.RECEIVE_LOBBY_INFO = 'RECEIVE_LOBBY_INFO';
exports.PLAYERS_UPDATED = 'PLAYERS_UPDATED';
exports.JOIN_TABLE = 'JOIN_TABLE';
exports.TABLE_JOINED = 'TABLE_JOINED';
exports.LEAVE_TABLE = 'LEAVE_TABLE';
exports.TABLE_LEFT = 'TABLE_LEFT';
exports.TABLES_UPDATED = 'TABLES_UPDATED';
exports.TABLE_UPDATED = 'TABLE_UPDATED';
exports.TABLE_MESSAGE = 'TABLE_MESSAGE';
exports.REBUY = 'REBUY';
exports.SIT_DOWN = 'SIT_DOWN';
exports.STAND_UP = 'STAND_UP';
exports.SITTING_OUT = 'SITTING_OUT';
exports.SITTING_IN = 'SITTING_IN';
exports.DISCONNECT = 'DISCONNECT';

// Ceki room + round events
exports.CREATE_ROOM = 'CREATE_ROOM';
exports.ROOM_CREATED = 'ROOM_CREATED';
exports.JOIN_ROOM = 'JOIN_ROOM';
exports.ROOM_JOINED = 'ROOM_JOINED';
exports.ROOM_UPDATED = 'ROOM_UPDATED';
exports.LEAVE_ROOM = 'LEAVE_ROOM';
exports.ROOM_LEFT = 'ROOM_LEFT';
exports.START_GAME = 'START_GAME';
exports.GAME_STARTED = 'GAME_STARTED';
exports.DRAW_CARD = 'DRAW_CARD';
exports.MELD_FROM_DISCARD = 'MELD_FROM_DISCARD';
exports.DISCARD_CARD = 'DISCARD_CARD';
exports.ANNOUNCE_CEKI = 'ANNOUNCE_CEKI';
exports.CLOSE_CARD = 'CLOSE_CARD';
exports.ROUND_ENDED = 'ROUND_ENDED';
exports.GAME_ENDED = 'GAME_ENDED';
exports.ROOM_ERROR = 'ROOM_ERROR';
exports.COMPLETE_MINIGAME = 'COMPLETE_MINIGAME';
exports.SEND_STICKER = 'SEND_STICKER';
exports.STICKER_SENT = 'STICKER_SENT';
exports.MINIGAME_TAP = 'MINIGAME_TAP';
exports.MINIGAME_PROGRESS = 'MINIGAME_PROGRESS';

// --- Voice chat (WebRTC signalling) ---------------------------------------
// The server only brokers the handshake; once peers are connected the audio
// flows directly between them and never touches this process.
exports.VOICE_JOIN = 'VOICE_JOIN';
exports.VOICE_LEAVE = 'VOICE_LEAVE';
exports.VOICE_PEERS = 'VOICE_PEERS';
exports.VOICE_PEER_JOINED = 'VOICE_PEER_JOINED';
exports.VOICE_PEER_LEFT = 'VOICE_PEER_LEFT';
exports.VOICE_SIGNAL = 'VOICE_SIGNAL';
exports.VOICE_ROSTER = 'VOICE_ROSTER';
