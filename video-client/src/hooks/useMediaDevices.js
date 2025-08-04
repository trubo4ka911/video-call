// src/hooks/useMediaDevices.js
import { useState, useEffect } from "react";

export function useMediaDevices() {
  const [videoInputs, setVideoInputs] = useState([]);
  const [audioInputs, setAudioInputs] = useState([]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
      setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  return { videoInputs, audioInputs };
}
