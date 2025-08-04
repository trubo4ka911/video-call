// src/hooks/useLocalStream.js
import { useRef, useCallback } from "react";

export function useLocalStream(selectedVideo, selectedAudio) {
  const localVideoRef = useRef();

  const getLocalStream = useCallback(async () => {
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

  return [localVideoRef, getLocalStream];
}
