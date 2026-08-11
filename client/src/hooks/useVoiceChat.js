import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VOICE_JOIN,
  VOICE_LEAVE,
  VOICE_PEERS,
  VOICE_PEER_JOINED,
  VOICE_PEER_LEFT,
  VOICE_SIGNAL,
  VOICE_ROSTER,
} from '../pokergame/actions';

// Full-mesh WebRTC voice chat: every participant holds a direct connection to
// every other one. Fine at this scale -- a Ceki room is 2-4 players, so at
// most 3 outgoing streams each. Audio never passes through our server; it only
// brokers the handshake.
//
// STUN alone (no TURN) is enough for most home networks. Behind a symmetric
// NAT or a restrictive corporate firewall two peers may fail to find a path,
// and there is no relay to fall back on -- that call simply won't connect.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export default function useVoiceChat({ socket, code, seatId }) {
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map()); // seatId -> { pc, audio }
  const joinedRef = useRef(false);

  const emit = useCallback(
    (event, payload) => {
      if (socket && code) socket.emit(event, { code, ...payload });
    },
    [socket, code],
  );

  const destroyPeer = useCallback((peerSeatId) => {
    const peer = peersRef.current.get(peerSeatId);
    if (!peer) return;
    try {
      peer.pc.close();
    } catch (e) {
      /* already closed */
    }
    if (peer.audio) {
      peer.audio.srcObject = null;
      if (peer.audio.parentNode) peer.audio.parentNode.removeChild(peer.audio);
    }
    peersRef.current.delete(peerSeatId);
  }, []);

  const createPeer = useCallback(
    (peerSeatId) => {
      const existing = peersRef.current.get(peerSeatId);
      if (existing) return existing.pc;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Attached to the document rather than kept as a bare Audio object --
      // some mobile browsers refuse to start playback on a detached element.
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);

      pc.ontrack = (ev) => {
        const [remote] = ev.streams;
        audio.srcObject = remote;
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          emit(VOICE_SIGNAL, { toSeatId: peerSeatId, data: { candidate: ev.candidate } });
        }
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed'].includes(pc.connectionState)) destroyPeer(peerSeatId);
      };

      peersRef.current.set(peerSeatId, { pc, audio });
      return pc;
    },
    [emit, destroyPeer],
  );

  const leave = useCallback(() => {
    joinedRef.current = false;
    Array.from(peersRef.current.keys()).forEach(destroyPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setJoined(false);
    setMicMuted(false);
    emit(VOICE_LEAVE, {});
  }, [destroyPeer, emit]);

  const join = useCallback(async () => {
    if (joinedRef.current || connecting) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser ini tidak mendukung voice chat.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      joinedRef.current = true;
      setJoined(true);
      emit(VOICE_JOIN, {});
    } catch (e) {
      // Overwhelmingly this is the user declining the mic prompt.
      setError(
        e && e.name === 'NotAllowedError'
          ? 'Akses mikrofon ditolak. Izinkan di pengaturan browser untuk memakai voice.'
          : 'Tidak bisa mengakses mikrofon.',
      );
    } finally {
      setConnecting(false);
    }
  }, [connecting, emit]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    setMicMuted((m) => {
      const next = !m;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }, []);

  // --- Signalling ----------------------------------------------------------
  useEffect(() => {
    if (!socket) return undefined;

    // Only the arriving peer places calls. If both sides offered at once
    // they'd collide (glare) and the handshake would have to be unwound.
    const onPeers = async ({ seatIds }) => {
      if (!joinedRef.current) return;
      for (const peerSeatId of seatIds) {
        const pc = createPeer(peerSeatId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emit(VOICE_SIGNAL, { toSeatId: peerSeatId, data: { sdp: pc.localDescription } });
        } catch (e) {
          /* peer may have left mid-handshake */
        }
      }
    };

    const onSignal = async ({ fromSeatId, data }) => {
      if (!joinedRef.current) return;
      const pc = createPeer(fromSeatId);
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            emit(VOICE_SIGNAL, { toSeatId: fromSeatId, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (e) {
        /* out-of-order or stale signalling: drop it rather than crash */
      }
    };

    const onPeerLeft = ({ seatId: goneSeatId }) => destroyPeer(goneSeatId);
    const onRoster = ({ seatIds }) => setRoster(seatIds || []);

    socket.on(VOICE_PEERS, onPeers);
    socket.on(VOICE_SIGNAL, onSignal);
    socket.on(VOICE_PEER_LEFT, onPeerLeft);
    socket.on(VOICE_ROSTER, onRoster);
    // Nothing to do when someone else joins -- they call us.
    socket.on(VOICE_PEER_JOINED, () => {});

    return () => {
      socket.off(VOICE_PEERS, onPeers);
      socket.off(VOICE_SIGNAL, onSignal);
      socket.off(VOICE_PEER_LEFT, onPeerLeft);
      socket.off(VOICE_ROSTER, onRoster);
    };
  }, [socket, createPeer, destroyPeer, emit]);

  // Tear the mic and every peer connection down if the player navigates away
  // while still on the call.
  useEffect(
    () => () => {
      Array.from(peersRef.current.keys()).forEach(destroyPeer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    },
    [destroyPeer],
  );

  return {
    joined,
    connecting,
    micMuted,
    roster: roster.filter((id) => id !== seatId),
    rosterAll: roster,
    error,
    join,
    leave,
    toggleMic,
  };
}
