import React, { useRef, useState } from "react";
import { usePeerConnection } from "./usePeerConnection";
import { useSwapCamera } from "./useSwapCamera";

export function useCall({
  socket,
  localRef,
  remoteRef,
  vidDevice,
  audDevice,
  getLocalStream,
  onStatus,
  onError,
}) {
  const [status, setStatus] = useState("idle");
  const [callee, setCallee] = useState(null);
  const [offerSDP, setOfferSDP] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const originalStreamRef = useRef(null);
  const iceBuffer = useRef([]);

  const { peerRef, createPeer, destroyPeer } = usePeerConnection({
    socket,
    remoteId: callee,
    onRemoteStream: (stream) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = stream;
        setStatus("in-call");
        onStatus && onStatus("in-call");
      }
    },
    onEnded: cleanup,
  });

  // Incoming call and signaling listeners
  React.useEffect(() => {
    function handleIncomingCall({ fromUserId, signalData }) {
      setCallee(fromUserId);
      if (
        !offerSDP &&
        signalData.type &&
        (signalData.type === "offer" || signalData.type === "answer")
      ) {
        setOfferSDP(signalData);
        setStatus("ringing");
      }
    }
    function handleCallAnswered({ signalData }) {
      if (peerRef.current) peerRef.current.signal(signalData);
    }
    function handleIceCandidate({ candidate }) {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      } else {
        iceBuffer.current.push(candidate);
      }
    }
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
    };
  }, [socket, offerSDP, peerRef, iceBuffer]);

  useSwapCamera(localRef, peerRef, originalStreamRef, vidDevice);

  async function startCall({ initiator, target, offerSDP: incomingOffer }) {
    setStatus(initiator ? "calling" : "answering");
    let localStream;
    try {
      localStream = await getLocalStream();
    } catch (err) {
      onError && onError("Failed to get local stream");
      localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      localRef.current.srcObject = localStream;
    }
    if (!localStream) {
      onError && onError("No local stream available");
      return;
    }
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
  }

  function cleanup() {
    [localRef.current, remoteRef.current].forEach((v) => {
      v?.srcObject?.getTracks().forEach((t) => t.stop());
      if (v) v.srcObject = null;
    });
    setStatus("idle");
    setCallee(null);
    setOfferSDP(null);
    setMuted(false);
    setVideoOff(false);
  }

  const call = (target) => startCall({ initiator: true, target });
  const answer = (offer) => startCall({ initiator: false, offerSDP: offer });
  const hangup = () => {
    destroyPeer();
    cleanup();
  };
  const toggleMute = () => {
    const [t] = localRef.current.srcObject.getAudioTracks();
    t.enabled = muted;
    setMuted((m) => !m);
  };
  const toggleVideo = () => {
    const [t] = localRef.current.srcObject.getVideoTracks();
    t.enabled = videoOff;
    setVideoOff((v) => !v);
  };

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
  };
}
