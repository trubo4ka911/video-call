import "./CallControls.css";
// src/components/CallControls.js
import React from "react";
export default function CallControls({
  status,
  onMute,
  onToggleVideo,
  onHangup,
  muted,
  videoOff,
  videoDevices = [],
  audioDevices = [],
  selectedVideo,
  selectedAudio,
  onSelectVideo,
  onSelectAudio,
}) {
  if (status !== "calling" && status !== "in-call") return null;

  return (
    <div className="controls-container">
      <label>
        Camera:
        <select
          value={selectedVideo}
          onChange={(e) => onSelectVideo(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="front">Front (facingMode:user)</option>
          <option value="back">Back (facingMode:environment)</option>
          {videoDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <button onClick={onToggleVideo}>
        {videoOff ? "Start Video" : "Stop Video"}
      </button>
      <label>
        Microphone:
        <select
          value={selectedAudio}
          onChange={(e) => onSelectAudio(e.target.value)}
        >
          <option value="default">Default</option>
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
      </label>
      <button onClick={onMute}>{muted ? "Unmute" : "Mute"}</button>
      <button className="end-call" onClick={onHangup}>
        End Call
      </button>
    </div>
  );
}
