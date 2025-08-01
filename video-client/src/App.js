// src/App.js
import React, { useState, useRef, useEffect, useCallback } from "react";
import SimplePeer from "simple-peer";
import { socket } from "./socket";
import VideoPlayer from "./components/VideoPlayer";
import IncomingCallModal from "./components/IncomingCallModal";
import CallButton from "./components/CallButton";
import CallControls from "./components/CallControls";
import "./App.css"; // add your layout/styles here

function App() {
  const [status, setStatus] = useState("idle");
  const [remoteId, setRemoteId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("default");
  const [selectedAudio, setSelectedAudio] = useState("default");

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const prevVideoRef = useRef("default");

  // 1) Enumerate once
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      setVideoDevices(devs.filter((d) => d.kind === "videoinput"));
    });
  }, []);

  // 2) Only swap when selectedVideo truly changes
  useEffect(() => {
    if (prevVideoRef.current === selectedVideo) return;
    prevVideoRef.current = selectedVideo;
    swapVideoDevice(selectedVideo);
  }, [selectedVideo]);

  // 3) swapVideoDevice pulls out old video, stops it, opens new one, replaces track
  const swapVideoDevice = async (deviceId) => {
    const oldStream = localVideoRef.current?.srcObject;
    if (!oldStream) return;

    const oldVideoTrack = oldStream.getVideoTracks()[0];
    oldVideoTrack.stop(); // free camera

    let newVidStream;
    try {
      newVidStream = await navigator.mediaDevices.getUserMedia({
        video:
          deviceId === "default" ? true : { deviceId: { exact: deviceId } },
        audio: false,
      });
    } catch (err) {
      console.error("camera open failed:", err);
      return;
    }
    const newVideoTrack = newVidStream.getVideoTracks()[0];

    // replace on peer
    if (peerRef.current) {
      peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, oldStream);
    }

    // rebuild local stream (keep audio from oldStream)
    const audioTracks = oldStream.getAudioTracks();
    const combined = new MediaStream([newVideoTrack, ...audioTracks]);
    localVideoRef.current.srcObject = combined;

    // cleanup helper stream
    newVidStream.getTracks().forEach((t) => t.stop());
  };

  // Socket listeners…
  useEffect(() => {
    socket.on("connect", () => console.log("My ID:", socket.id));
    socket.on("call-request", ({ from }) => {
      setRemoteId(from);
      setStatus("ringing");
    });
    socket.on("call-accept", () => startPeer(true));
    socket.on("call-decline", ({ reason }) => {
      alert("Declined: " + reason);
      reset();
    });
    socket.on("signal", ({ data }) => {
      peerRef.current?.signal(data);
    });
    return () => {
      socket.off("call-request");
      socket.off("call-accept");
      socket.off("call-decline");
      socket.off("signal");
    };
  }, [remoteId]);

  // Whenever the selected devices change, swap media
  useEffect(() => {
    async function swapDevices() {
      // if not in a call yet, just get new local preview
      if (!localVideoRef.current?.srcObject) return;

      const oldStream = localVideoRef.current.srcObject;
      const oldVideoTrack = oldStream.getVideoTracks()[0];
      const oldAudioTrack = oldStream.getAudioTracks()[0];

      // new constraints from dropdowns
      const constraints = {
        video:
          selectedVideo === "default"
            ? true
            : { deviceId: { exact: selectedVideo } },
        audio:
          selectedAudio === "default"
            ? true
            : { deviceId: { exact: selectedAudio } },
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);

      // replace tracks on PeerConnection if active
      if (peerRef.current) {
        peerRef.current.replaceTrack(
          oldVideoTrack,
          newStream.getVideoTracks()[0],
          oldStream
        );
        peerRef.current.replaceTrack(
          oldAudioTrack,
          newStream.getAudioTracks()[0],
          oldStream
        );
      }

      // update local preview and clean up
      localVideoRef.current.srcObject = newStream;
      oldStream.getTracks().forEach((t) => t.stop());
    }
    swapDevices();
  }, [selectedVideo, selectedAudio]);

  // Get local media (called on peer start)
  const getMedia = useCallback(async () => {
    const constraints = {
      video:
        selectedVideo === "default"
          ? true
          : { deviceId: { exact: selectedVideo } },
      audio:
        selectedAudio === "default"
          ? true
          : { deviceId: { exact: selectedAudio } },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideoRef.current.srcObject = stream;
    return stream;
  }, [selectedVideo, selectedAudio]);

  // Kick off a call
  const callUser = async (id) => {
    setRemoteId(id);
    setStatus("calling");
    socket.emit("call-request", { to: id });
  };

  // Answer or start peer
  const startPeer = async (initiator) => {
    const stream = await getMedia();
    const peer = new SimplePeer({ initiator, trickle: true, stream });
    peer.on("signal", (data) => socket.emit("signal", { to: remoteId, data }));
    peer.on("stream", (remoteStream) => {
      console.log("Got remote stream!", remoteStream);
      remoteVideoRef.current.srcObject = remoteStream;
    });
    peerRef.current = peer;
    setStatus("in-call");
  };

  // Accept incoming call
  const acceptCall = () => {
    setStatus("calling");
    startPeer(false);
    socket.emit("call-accept", { to: remoteId });
  };

  // Decline
  const declineCall = () => {
    socket.emit("call-decline", { to: remoteId, reason: "Busy" });
    reset();
  };

  // Hang up / cancel
  const hangUp = () => {
    if (peerRef.current) peerRef.current.destroy();
    // stop & clear streams
    [localVideoRef.current, remoteVideoRef.current].forEach((v) => {
      const s = v.srcObject;
      if (s) s.getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    });
    reset();
  };

  const reset = () => {
    setStatus("idle");
    setRemoteId(null);
    setMuted(false);
    setVideoOff(false);
  };

  // Controls
  const toggleMute = () => {
    const [t] = localVideoRef.current.srcObject.getAudioTracks();
    t.enabled = muted;
    setMuted(!muted);
  };
  const toggleVideo = () => {
    const [t] = localVideoRef.current.srcObject.getVideoTracks();
    t.enabled = videoOff;
    setVideoOff(!videoOff);
  };
  const switchCamera = async () => {
    // 1) Pull out the old local stream & its video track
    const oldStream = localVideoRef.current.srcObject;
    if (!oldStream) return;
    const oldVideoTrack = oldStream.getVideoTracks()[0];

    // 2) Get a new stream with the other camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: videoOff ? "environment" : "user" },
      audio: true,
    });
    const newVideoTrack = newStream.getVideoTracks()[0];

    // 3) Replace the track on the existing RTCPeerConnection
    //    Using simple-peer's helper:
    peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, oldStream);

    // 4) Show the new stream locally
    localVideoRef.current.srcObject = newStream;
    setVideoOff(false);

    // 5) Now stop the old stream's tracks
    oldStream.getTracks().forEach((t) => t.stop());
  };

  return (
    <div className="app-container">
      <div className="videos">
        <VideoPlayer
          streamRef={localVideoRef}
          muted={true}
          style={{ width: 200 }}
        />
        <VideoPlayer
          streamRef={remoteVideoRef}
          muted={false}
          style={{ width: 400 }}
        />
      </div>

      {status === "ringing" && (
        <IncomingCallModal onAccept={acceptCall} onDecline={declineCall} />
      )}

      <CallButton
        status={status}
        onCall={() => {
          const id = prompt("Enter user ID");
          callUser(id);
        }}
        onCancel={hangUp}
      />

      <CallControls
        status={status}
        onMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCam={switchCamera} // optional, you can remove if dropdown covers it
        onHangup={hangUp}
        muted={muted}
        videoOff={videoOff}
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        selectedVideo={selectedVideo}
        selectedAudio={selectedAudio}
        onSelectVideo={setSelectedVideo}
        onSelectAudio={setSelectedAudio}
      />
    </div>
  );
}

export default App;
