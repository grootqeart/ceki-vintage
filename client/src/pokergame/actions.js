export const FOLD = 'FOLD';
export const CHECK = 'CHECK';
export const CALL = 'CALL';
export const RAISE = 'RAISE';
export const WINNER = 'WINNER';
export const FETCH_LOBBY_INFO = 'FETCH_LOBBY_INFO';
export const RECEIVE_LOBBY_INFO = 'RECEIVE_LOBBY_INFO';
export const PLAYERS_UPDATED = 'PLAYERS_UPDATED';
export const JOIN_TABLE = 'JOIN_TABLE';
export const TABLE_JOINED = 'TABLE_JOINED';
export const LEAVE_TABLE = 'LEAVE_TABLE';
export const TABLE_LEFT = 'TABLE_LEFT';
export const TABLES_UPDATED = 'TABLES_UPDATED';
export const TABLE_UPDATED = 'TABLE_UPDATED';
export const TABLE_MESSAGE = 'TABLE_MESSAGE';
export const REBUY = 'REBUY';
export const SIT_DOWN = 'SIT_DOWN';
export const STAND_UP = 'STAND_UP';
export const SITTING_OUT = 'SITTING_OUT';
export const SITTING_IN = 'SITTING_IN';
export const DISCONNECT = 'DISCONNECT';

// Ceki room + round events
export const CREATE_ROOM = 'CREATE_ROOM';
export const ROOM_CREATED = 'ROOM_CREATED';
export const JOIN_ROOM = 'JOIN_ROOM';
export const ROOM_JOINED = 'ROOM_JOINED';
export const ROOM_UPDATED = 'ROOM_UPDATED';
export const LEAVE_ROOM = 'LEAVE_ROOM';
export const ROOM_LEFT = 'ROOM_LEFT';
export const START_GAME = 'START_GAME';
export const GAME_STARTED = 'GAME_STARTED';
export const DRAW_CARD = 'DRAW_CARD';
export const MELD_FROM_DISCARD = 'MELD_FROM_DISCARD';
export const DISCARD_CARD = 'DISCARD_CARD';
export const ANNOUNCE_CEKI = 'ANNOUNCE_CEKI';
export const CLOSE_CARD = 'CLOSE_CARD';
export const ROUND_ENDED = 'ROUND_ENDED';
export const GAME_ENDED = 'GAME_ENDED';
export const ROOM_ERROR = 'ROOM_ERROR';
export const COMPLETE_MINIGAME = 'COMPLETE_MINIGAME';
export const SEND_STICKER = 'SEND_STICKER';
export const STICKER_SENT = 'STICKER_SENT';
export const MINIGAME_TAP = 'MINIGAME_TAP';
export const MINIGAME_PROGRESS = 'MINIGAME_PROGRESS';

// --- Voice chat (WebRTC signalling) ---------------------------------------
// KEEP IN SYNC WITH server/pokergame/actions.js
export const VOICE_JOIN = 'VOICE_JOIN';
export const VOICE_LEAVE = 'VOICE_LEAVE';
export const VOICE_PEERS = 'VOICE_PEERS';
export const VOICE_PEER_JOINED = 'VOICE_PEER_JOINED';
export const VOICE_PEER_LEFT = 'VOICE_PEER_LEFT';
export const VOICE_SIGNAL = 'VOICE_SIGNAL';
export const VOICE_ROSTER = 'VOICE_ROSTER';
