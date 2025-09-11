import "./VideoScreen.css";
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
import { useSwapCamera } from "./hooks/useSwapCamera";

export default function App() {
  // ── Login ──
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [me, setMe] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [online, setOnline] = useState([]);
  const [userSource, setUserSource] = useState("management");
  const [search, setSearch] = useState("");

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
    peerRef,
    originalStreamRef,
  } = useCall({
    socket,
    localRef,
    remoteRef,
    vidDevice,
    audDevice,
    getLocalStream,
    onError: (msg) => alert(msg),
    me,
  });

  // Wire camera swap handling: when vidDevice changes, attempt in-call swap
  useSwapCamera(
    localRef,
    /* peerRef */ peerRef,
    /* originalStreamRef */ originalStreamRef,
    vidDevice
  );

  // ── Socket listeners ──
  useEffect(() => {
    socket.on("online-list", setOnline);
    return () => {
      socket.off("online-list");
    };
  }, []);

  // ── Load users for selected source (for login) ──
  useEffect(() => {
    const url = `https://10.82.20.126:9001/api/users/${userSource}?search=${encodeURIComponent(
      search
    )}`;
    fetch(url)
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, [userSource, search]);

  // ── Load all users from both sources (for online detection) ──
  useEffect(() => {
    Promise.all([
      fetch("https://10.82.20.126:9001/api/users/management").then((r) =>
        r.json()
      ),
      fetch("https://10.82.20.126:9001/api/users/mobile").then((r) => r.json()),
    ]).then(([mgt, mob]) => setAllUsers([...mgt, ...mob]));
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
        source={userSource}
        onSourceChange={setUserSource}
        search={search}
        onSearch={setSearch}
        socket={socket}
      />
    );
  }

  // Decline handler
  const decline = () => {
    cleanup();
  };

  // Only show online users from both DBs, exclude self
  const onlineOtherUsers = allUsers.filter(
    (u) => online.includes(u.SearchUser) && u.SearchUser !== me
  );

  // Find info for logged-in user
  const loggedInUser = allUsers.find((u) => u.SearchUser === me);

  return (
    <div className="app-container">
      {loggedInUser && (
        <div
          style={{
            marginBottom: 16,
            padding: 8,
            background: "#f0f6ff",
            borderRadius: 6,
          }}
        >
          <strong>Logged in as:</strong> {loggedInUser.SearchUser} 🟢
          {loggedInUser.FirstName !== undefined &&
          loggedInUser.LastName !== undefined ? (
            <>
              {" | Name: "}
              {loggedInUser.FirstName} {loggedInUser.LastName}
              {" | Admin type: "}
              {loggedInUser.UserType}
            </>
          ) : (
            <>
              {" | PIN Number: "}
              {loggedInUser.PINNumber}
              {" | Admin type: "}
              {loggedInUser.UserType}
            </>
          )}
        </div>
      )}
      <UserPicker
        users={onlineOtherUsers}
        onlineUsers={online}
        currentUserId={me}
        value={target}
        onChange={setTarget}
        onCall={() => call(target)}
      />

      <div
        className="videos"
        style={{
          display:
            status === "calling" || status === "in-call" || status === "ringing"
              ? "flex"
              : "none",
        }}
      >
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
        <IncomingCallModal
          onAccept={() => answer(offerSDP)}
          onDecline={decline}
        />
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
