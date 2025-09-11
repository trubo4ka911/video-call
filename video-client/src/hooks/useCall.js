import { useRef, useState, useEffect, useCallback } from "react";
import { usePeerConnection } from "./usePeerConnection";

export function useCall({
  socket,
  localRef,
  remoteRef,
  vidDevice,
  audDevice,
  getLocalStream,
  onStatus,
  onError,
  me,
}) {
  const [status, setStatus] = useState("idle");
  const [callee, setCallee] = useState(null);
  const [offerSDP, setOfferSDP] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const originalStreamRef = useRef(null);
  const iceBuffer = useRef([]);

  const cleanup = useCallback(() => {
    [localRef.current, remoteRef.current].forEach((v) => {
      v?.srcObject?.getTracks().forEach((t) => t.stop());
      if (v) v.srcObject = null;
    });
    setStatus("idle");
    setCallee(null);
    setOfferSDP(null);
    setMuted(false);
    setVideoOff(false);
  }, [localRef, remoteRef]);

  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT = 2;
  // Use refs to avoid referencing functions before they are created
  const createPeerRef = useRef();
  const destroyPeerRef = useRef();
  const hangupRef = useRef();

  const handleConnectionFailed = useCallback(() => {
    console.warn("[call] connection failed event received, attempting reconnect...");
    if (reconnectAttempts.current >= MAX_RECONNECT) {
      console.warn("[call] max reconnect attempts reached, giving up");
      hangupRef.current?.();
      return;
    }
    reconnectAttempts.current += 1;
    const localStream = originalStreamRef.current;
    destroyPeerRef.current?.();
    setTimeout(async () => {
      try {
        await createPeerRef.current?.({ initiator: true, stream: localStream });
        console.log('[call] reconnect attempt created new peer');
      } catch (e) {
        console.warn('[call] reconnect attempt failed', e);
      }
    }, 500);
  }, []);

  const { peerRef, createPeer, destroyPeer } = usePeerConnection({
    socket,
    remoteId: callee,
    onRemoteStream: (stream) => {
      try {
        if (remoteRef.current) {
          // assign the incoming stream and try to start playback; Safari/iPad
          // may block autoplay so play() can reject — that's handled in
          // the VideoPlayer component, but we still try here to surface
          // errors early and call onError.
          remoteRef.current.srcObject = stream;
          const p = remoteRef.current.play && remoteRef.current.play();
          if (p && typeof p.then === "function") {
            p.catch((err) => {
              console.warn("remote video play() rejected:", err);
            });
          }
          setStatus("in-call");
          onStatus?.("in-call");
        }
      } catch (err) {
        console.error("Failed to attach remote stream to video element:", err);
        onError?.("Failed to attach remote stream");
      }
    },
    onEnded: cleanup,
    onConnectionFailed: handleConnectionFailed,
  });

  // populate refs for use in the failure handler
  createPeerRef.current = createPeer;
  destroyPeerRef.current = destroyPeer;
  // hangup defined below but we set ref here and update after definition
  hangupRef.current = () => {};

  const hangup = useCallback(() => {
    if (callee) {
      socket.emit("hangup-call", { toUserId: callee, fromUserId: me });
    }
    destroyPeer();
    cleanup();
  }, [callee, socket, me, destroyPeer, cleanup]);

  // expose hangup to the ref used by reconnect handler
  hangupRef.current = hangup;

  const startCall = useCallback(
    async ({ initiator, target, offerSDP: incomingOffer }) => {
      let localStream;
      try {
        localStream = await getLocalStream();
      } catch (err) {
        onError?.("Failed to get local stream");
        localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
      }

      if (!localStream) {
        onError?.("No local stream available");
        return;
      }

      localRef.current.srcObject = localStream;
      originalStreamRef.current = localStream;

      await createPeer({ initiator, stream: localStream });
      const peer = peerRef.current;

      if (iceBuffer.current.length > 0) {
        iceBuffer.current.forEach((candidate) => {
          peer.signal(candidate);
        });
        iceBuffer.current = [];
      }

      peer.on("signal", (data) => {
        if (initiator) {
          socket.emit("call-user", { toUserId: target, signalData: data });
        } else {
          socket.emit("answer-call", { toUserId: callee, signalData: data });
        }
      });

      if (!initiator && incomingOffer) {
        peer.signal(incomingOffer);
        setOfferSDP(null);
      }
    },
    [getLocalStream, onError, localRef, createPeer, peerRef, socket, callee]
  );

  const call = useCallback(
    (target) => startCall({ initiator: true, target }),
    [startCall]
  );
  const answer = (offer) => startCall({ initiator: false, offerSDP: offer });

  const toggleMute = () => {
    const [track] = localRef.current?.srcObject?.getAudioTracks() || [];
    if (track) track.enabled = muted;
    setMuted((prev) => !prev);
  };

  const toggleVideo = () => {
    const [track] = localRef.current?.srcObject?.getVideoTracks() || [];
    if (track) track.enabled = videoOff;
    setVideoOff((prev) => !prev);
  };

  useEffect(() => {
    function handleIncomingCall({ fromUserId, signalData }) {
      setCallee(fromUserId);
      if (
        !offerSDP &&
        signalData?.type &&
        ["offer", "answer"].includes(signalData.type)
      ) {
        setOfferSDP(signalData);
        setStatus("ringing");
      }
    }

    function handleCallAnswered({ signalData }) {
      if (peerRef.current) {
        peerRef.current.signal(signalData);
      }
    }

    function handleIceCandidate({ candidate }) {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      } else {
        iceBuffer.current.push(candidate);
      }
    }

    function handleCallHangup() {
      hangup();
    }

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-hangup", handleCallHangup);

    window.socket = socket;
    window.me = me;
    window.callee = callee;
    window.hangup = hangup;
    window.call = call;

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-hangup", handleCallHangup);
    };
  }, [socket, peerRef, offerSDP, hangup, call, callee, me]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    callee,
    offerSDP,
    setCallee,
    setOfferSDP,
    call,
    answer,
    hangup,
    toggleMute,
    toggleVideo,
    muted,
    videoOff,
    peerRef,
    iceBuffer,
    cleanup,
    originalStreamRef,
  };
}
