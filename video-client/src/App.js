import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";

import Login from "./components/Login";
import UserPicker from "./components/UserPicker";
import VideoPlayer from "./components/VideoPlayer";
import IncomingCallModal from "./components/IncomingCallModal";
import CallControls from "./components/CallControls";

import { useMediaDevices } from "./hooks/useMediaDevices";
import { useLocalStream } from "./hooks/useLocalStream";
import { useCall } from "./hooks/useCall";

export default function App() {
  // ── Login ──
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [online, setOnline] = useState([]);

  // ── Call State ──
  const [target, setTarget] = useState("");
  const [vidDevice, setVidDevice] = useState("default");
  const [audDevice, setAudDevice] = useState("default");

  // ── hooks ─
  const { videoInputs, audioInputs } = useMediaDevices();
  const [localRef, getLocalStream] = useLocalStream(vidDevice, audDevice);

  const remoteRef = useRef();
  const {
    status,
    offerSDP,
    call,
    answer,
    hangup,
    toggleMute,
    toggleVideo,
    muted,
    videoOff,
    cleanup,
  } = useCall({
    socket,
    localRef,
    remoteRef,
    vidDevice,
    audDevice,
    getLocalStream,
    onError: (msg) => alert(msg),
  });

  // ── Socket listeners ──
  useEffect(() => {
    socket.on("online-list", setOnline);
    return () => {
      socket.off("online-list");
    };
  }, []);

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


  // Decline handler
  const decline = () => {
    cleanup();
  };

  return (
    <div className="app-container">

      <UserPicker
        users={users}
        onlineUsers={online}
        currentUserId={me}
        value={target}
        onChange={setTarget}
        onCall={() => call(target)}
      />

      <div className="videos">
        <div className="video-block">
          <span className="video-label">You</span>
          <VideoPlayer streamRef={localRef} muted style={{ width: 200 }} />
        </div>
        <div className="video-block">
          <span className="video-label">Remote</span>
          <VideoPlayer streamRef={remoteRef} style={{ width: 400 }} />
        </div>
      </div>

      {status === "ringing" && (
        <IncomingCallModal onAccept={() => answer(offerSDP)} onDecline={decline} />
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
