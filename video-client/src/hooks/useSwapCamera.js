// src/hooks/useSwapCamera.js
import { useEffect, useRef } from "react";

export function useSwapCamera(
  localVideoRef,
  peerRef,
  originalStreamRef,
  selectedDeviceId
) {
  const prev = useRef("default");

  useEffect(() => {
    if (prev.current === selectedDeviceId) return;
    prev.current = selectedDeviceId;

    const original = originalStreamRef.current;
    if (!original) return;

    const oldVideoTrack = original.getVideoTracks()[0];
    if (!oldVideoTrack) return;

    (async () => {
      // 1) open the new camera:
      let tmp;
      try {
        tmp = await navigator.mediaDevices.getUserMedia({
          video:
            selectedDeviceId === "default"
              ? true
              : { deviceId: { exact: selectedDeviceId } },
          audio: false,
        });
      } catch (err) {
        console.error("Could not open new camera:", err);
        return;
      }
      const newVideoTrack = tmp.getVideoTracks()[0];

      // 2) swap on the peer using the *original* stream
      if (peerRef.current) {
        peerRef.current.replaceTrack(oldVideoTrack, newVideoTrack, original);
      }

      // 3) remove the old track from that stream, add the new one
      original.removeTrack(oldVideoTrack);
      original.addTrack(newVideoTrack);
      oldVideoTrack.stop();

      // 4) update your <video> preview
      localVideoRef.current.srcObject = original;

      // 5) clean up: stop only tracks from tmp that are NOT the one we just added
      tmp.getTracks().forEach((t) => {
        if (t !== newVideoTrack) t.stop();
      });
    })();
  }, [selectedDeviceId, localVideoRef, peerRef, originalStreamRef]);
}
