// src/hooks/useMediaDevices.js
import { useState, useEffect } from "react";

export function useMediaDevices() {
  const [videoInputs, setVideoInputs] = useState([]);
  const [audioInputs, setAudioInputs] = useState([]);

  useEffect(() => {
    const hasMediaDevices =
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices === "object";

    // If mediaDevices isn't available (insecure context / unsupported browser), bail gracefully
    if (!hasMediaDevices) {
      setVideoInputs([]);
      setAudioInputs([]);
      return () => {};
    }

    async function ensurePermissionsAndUpdate() {
      // Try to prompt permissions only if getUserMedia exists
      try {
        if (navigator && navigator.permissions && navigator.permissions.query) {
          try {
            const perms = await navigator.permissions.query({ name: "camera" });
            if (perms.state !== "granted") {
              if (
                navigator.mediaDevices &&
                typeof navigator.mediaDevices.getUserMedia === "function"
              ) {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                  });
                  stream.getTracks().forEach((t) => t.stop());
                } catch {}
              }
            }
          } catch {}
        }
      } catch {}

      if (
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.enumerateDevices === "function"
      ) {
        navigator.mediaDevices.enumerateDevices().then((devices) => {
          setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
          setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
        });
      } else {
        setVideoInputs([]);
        setAudioInputs([]);
      }
    }

    // Initial population
    ensurePermissionsAndUpdate();

    // Listen to device changes if supported
    let cleanup = () => {};
    const canAddListener =
      typeof navigator.mediaDevices.addEventListener === "function";
    if (canAddListener) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        ensurePermissionsAndUpdate
      );
      cleanup = () =>
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          ensurePermissionsAndUpdate
        );
    } else if ("ondevicechange" in navigator.mediaDevices) {
      const prev = navigator.mediaDevices.ondevicechange;
      navigator.mediaDevices.ondevicechange = ensurePermissionsAndUpdate;
      cleanup = () => {
        navigator.mediaDevices.ondevicechange = prev || null;
      };
    }

    return cleanup;
  }, []);

  return { videoInputs, audioInputs };
}
