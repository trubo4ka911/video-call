// src/components/CallControls.js
import React from "react";

export default function CallControls({
  status,
  // media toggles
  onMute,
  onToggleVideo,
  onSwitchCam, // you can remove this if you switch via dropdown
  onHangup,
  muted,
  videoOff,
  // device selection
  videoDevices = [],
  audioDevices = [],
  selectedVideo,
  selectedAudio,
  onSelectVideo,
  onSelectAudio,
}) {
  // only show when dialing or in-call
  if (status !== "calling" && status !== "in-call") return null;

  return (
    <div className="controls">
      {/* Device selectors */}
      <label>
        Camera:
        <select
          value={selectedVideo}
          onChange={(e) => onSelectVideo(e.target.value)}
        >
          <option value="default">Default</option>
          {videoDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
      </label>

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

      {/* Call controls */}
      <button onClick={onMute}>{muted ? "Unmute" : "Mute"}</button>
      <button onClick={onToggleVideo}>
        {videoOff ? "Start Video" : "Stop Video"}
      </button>
      {/* You can keep or remove the manual switchCamera button */}
      <button onClick={onSwitchCam}>Switch Camera</button>
      <button onClick={onHangup}>Hang Up</button>
    </div>
  );
}
