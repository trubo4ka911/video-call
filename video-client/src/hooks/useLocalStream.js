// src/hooks/useLocalStream.js
import { useRef, useCallback } from "react";

export function useLocalStream(selectedVideo, selectedAudio) {
  const localVideoRef = useRef();

  const getLocalStream = useCallback(async () => {
  // Support deviceId or simple 'front' / 'back' selectors for mobile
  let videoConstraint;
  if (selectedVideo === "default") videoConstraint = true;
  else if (selectedVideo === "front") videoConstraint = { facingMode: { ideal: "user" } };
  else if (selectedVideo === "back") videoConstraint = { facingMode: { ideal: "environment" } };
  else videoConstraint = { deviceId: { exact: selectedVideo } };

  let audioConstraint;
  if (selectedAudio === "default") audioConstraint = true;
  else audioConstraint = { deviceId: { exact: selectedAudio } };

  const constraints = { video: videoConstraint, audio: audioConstraint };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideoRef.current.srcObject = stream;
    return stream;
  }, [selectedVideo, selectedAudio]);

  return [localVideoRef, getLocalStream];
}
