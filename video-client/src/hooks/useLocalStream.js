// src/hooks/useLocalStream.js
import { useRef, useCallback } from "react";

export function useLocalStream(selectedVideo, selectedAudio) {
  const localVideoRef = useRef();

  const getLocalStream = useCallback(async () => {
    // Support deviceId or simple 'front' / 'back' selectors for mobile
    let videoConstraint;
    if (selectedVideo === "default") videoConstraint = true;
    else if (selectedVideo === "front")
      videoConstraint = { facingMode: { ideal: "user" } };
    else if (selectedVideo === "back")
      videoConstraint = { facingMode: { ideal: "environment" } };
    else videoConstraint = { deviceId: { exact: selectedVideo } };

    let audioConstraint;
    if (selectedAudio === "default") audioConstraint = true;
    else audioConstraint = { deviceId: { exact: selectedAudio } };

    const constraints = { video: videoConstraint, audio: audioConstraint };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      try {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.warn("Failed to attach local stream to video element:", err);
      }
      return stream;
    } catch (err) {
      console.error("getUserMedia failed:", err);
      throw err;
    }
  }, [selectedVideo, selectedAudio]);

  return [localVideoRef, getLocalStream];
}
