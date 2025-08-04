// src/hooks/useMediaDevices.js
import { useState, useEffect } from "react";

export function useMediaDevices() {
  const [videoInputs, setVideoInputs] = useState([]);
  const [audioInputs, setAudioInputs] = useState([]);

  useEffect(() => {
    let gotStream = false;
    async function ensurePermissionsAndUpdate() {
      try {
        // Try to get a dummy stream if permissions not already granted
        const perms = await navigator.permissions.query({ name: "camera" });
        if (perms.state !== "granted") {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            gotStream = true;
            stream.getTracks().forEach((t) => t.stop());
          } catch {}
        }
      } catch {}
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
        setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
      });
    }
    ensurePermissionsAndUpdate();
    navigator.mediaDevices.addEventListener(
      "devicechange",
      ensurePermissionsAndUpdate
    );
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        ensurePermissionsAndUpdate
      );
    };
  }, []);

  return { videoInputs, audioInputs };
}
