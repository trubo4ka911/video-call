import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";

import Login from "./components/Login";
import UserPicker from "./components/UserPicker";
import VideoPlayer from "./components/VideoPlayer";
import IncomingCallModal from "./components/IncomingCallModal";
import CallControls from "./components/CallControls";

import { useMediaDevices } from "./hooks/useMediaDevices";
import { useLocalStream } from "./hooks/useLocalStream";
import { usePeerConnection } from "./hooks/usePeerConnection";
import { useSwapCamera } from "./hooks/useSwapCamera";

export default function App() {
  // ── Login ──
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [online, setOnline] = useState([]);

  // ── Call State ──
  const [status, setStatus] = useState("idle");
  const [target, setTarget] = useState("");
  const [callee, setCallee] = useState(null);
  const [offerSDP, setOfferSDP] = useState(null);

  // ── Media state ──
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [vidDevice, setVidDevice] = useState("default");
  const [audDevice, setAudDevice] = useState("default");

  // ── hooks ─
  const { videoInputs, audioInputs } = useMediaDevices();
  const [localRef, getLocalStream] = useLocalStream(vidDevice, audDevice);

  const remoteRef = useRef();
  const iceBuffer = useRef([]); // buffer ICE candidates before peer exists
  const { peerRef, createPeer, destroyPeer } = usePeerConnection({
    socket,
    remoteId: callee,
    onRemoteStream: (stream) => {
      console.log("[onRemoteStream] Got remote stream:", stream);
      if (remoteRef.current) {
        remoteRef.current.srcObject = stream;
        setStatus("in-call");
      } else {
        console.warn("[onRemoteStream] remoteRef.current is null");
      }
    },
    onEnded: cleanup,
  });
  const originalStreamRef = useRef(null);
  // wire up the swap-camera logic
  useSwapCamera(localRef, peerRef, originalStreamRef, vidDevice);

  // ── Socket listeners ──
  useEffect(() => {
    // live online list
    socket.on("online-list", setOnline);

    // incoming offer
    socket.on("incoming-call", ({ fromUserId, signalData }) => {
      setCallee(fromUserId);
      // Only set offerSDP if it is not already set and signalData is an offer (not a candidate)
      if (!offerSDP && signalData.type && (signalData.type === "offer" || signalData.type === "answer")) {
        setOfferSDP(signalData);
        setStatus("ringing");
      } else {
        // Ignore if not an offer/answer
        console.log("[incoming-call] Ignored non-offer signalData", signalData);
      }
    });

    // callee’s answer
    socket.on("call-answered", ({ signalData }) => {
      if (peerRef.current) peerRef.current.signal(signalData);
    });

    // ICE candidates
    socket.on("ice-candidate", ({ candidate }) => {
      if (peerRef.current) {
        peerRef.current.signal(candidate);
      } else {
        // Buffer ICE candidates until peer is created
        iceBuffer.current.push(candidate);
        console.log("[ice-candidate] Buffered ICE candidate", candidate);
      }
    });

    return () => {
      socket.off("online-list");
      socket.off("incoming-call");
      socket.off("call-answered");
      socket.off("ice-candidate");
    };
  }, [callee, peerRef, offerSDP]);

  // ── Load users ──
  useEffect(() => {
    fetch("http://localhost:9001/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, []);

  // ── Identify ourselves & get online-list ──
  useEffect(() => {
    if (!loggedIn) return;
    socket.emit("identify", { userId: me });
  }, [loggedIn, me]);

  // ── Login screen ──
  if (!loggedIn) {
    return (
      <Login
        users={users}
        value={me}
        onChange={setMe}
        onLogin={() => setLoggedIn(true)}
      />
    );
  }

  // ── Core: start or answer ──
  async function startCall({ initiator }) {
    setStatus("calling");

    // 1) get local media
    let localStream;
    try {
      localStream = await getLocalStream();
    } catch (err) {
      console.warn("[startCall] Failed to get local stream, falling back to audio only", err);
      // fallback to audio only
      localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      localRef.current.srcObject = localStream;
    }
    if (!localStream) {
      console.error("[startCall] No local stream available!");
      return;
    }
    // store it for later swaps:
    originalStreamRef.current = localStream;
    // 2) create peer
    await createPeer({ initiator, stream: localStream });
    const peer = peerRef.current;
    // After peer is created, flush any buffered ICE candidates
    if (iceBuffer.current.length > 0) {
      iceBuffer.current.forEach((candidate) => {
        peer.signal(candidate);
      });
      iceBuffer.current = [];
    }

    // 3) wire up .signal → server events
    peer.on("signal", (data) => {
      if (initiator) {
        socket.emit("call-user", { toUserId: target, signalData: data });
      } else {
        socket.emit("answer-call", { toUserId: callee, signalData: data });
      }
    });

    // 4) if answering, inject the incoming offer
    if (!initiator && offerSDP) {
      console.log("[startCall] Answering with offerSDP", offerSDP);
      peer.signal(offerSDP);
      setOfferSDP(null);
    }
  }

  // ── Handlers ──
  const call = () => startCall({ initiator: true });
  const answer = () => startCall({ initiator: false });
  const decline = () => {
    socket.emit("call-decline", { toUserId: callee });
    cleanup();
  };
  const hangup = () => {
    destroyPeer();
    cleanup();
  };

  // ── Mute / Video ──
  const toggleMute = () => {
    const [t] = localRef.current.srcObject.getAudioTracks();
    t.enabled = muted;
    setMuted(!muted);
  };
  const toggleVideo = () => {
    const [t] = localRef.current.srcObject.getVideoTracks();
    t.enabled = videoOff;
    setVideoOff(!videoOff);
  };

  // ── Cleanup ──
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

  return (
    <div className="app-container">
      <UserPicker
        users={users}
        onlineUsers={online}
        currentUserId={me}
        value={target}
        onChange={setTarget}
        onCall={call}
      />

      <div className="videos">
        <VideoPlayer streamRef={localRef} muted style={{ width: 200 }} />
        <VideoPlayer streamRef={remoteRef} style={{ width: 400 }} />
      </div>

      {status === "ringing" && (
        <IncomingCallModal onAccept={answer} onDecline={decline} />
      )}

      <CallControls
        status={status}
        muted={muted}
        videoOff={videoOff}
        onMute={toggleMute}
        onToggleVideo={toggleVideo}
        onHangup={hangup}
        videoDevices={videoInputs}
        audioDevices={audioInputs}
        selectedVideo={vidDevice}
        selectedAudio={audDevice}
        onSelectVideo={setVidDevice}
        onSelectAudio={setAudDevice}
      />
    </div>
  );
}
