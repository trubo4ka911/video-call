import { useEffect, useRef } from "react";

function isiOS() {
  return (
    /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Swap camera during a call. Tries replaceTrack; if not possible or fails on
 * known-flaky platforms (iOS), falls back to restarting the call via global
 * helpers (window.hangup / window.call) which the app already exposes.
 */
export function useSwapCamera(
  localVideoRef,
  peerRef,
  originalStreamRef,
  selectedDeviceId
) {
  const prev = useRef("default");

  useEffect(() => {
  if (!selectedDeviceId) return;
  if (prev.current === selectedDeviceId) return;
  prev.current = selectedDeviceId;

  console.log("[SWAP] Requesting new camera:", selectedDeviceId);

    const original = originalStreamRef.current;
    if (!original) return;

  // note: oldVideoTrack will be re-fetched later as currentOld
    (async () => {
      // Build constraints supporting 'front'/'back' aliases
      let videoConstraint;
      if (selectedDeviceId === "default") videoConstraint = true;
      else if (selectedDeviceId === "front") videoConstraint = { facingMode: { ideal: "user" } };
      else if (selectedDeviceId === "back") videoConstraint = { facingMode: { ideal: "environment" } };
      else videoConstraint = { deviceId: { exact: selectedDeviceId } };

      try {
        const tmpStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
        const newVideoTrack = tmpStream.getVideoTracks()[0];
        if (!newVideoTrack) {
          tmpStream.getTracks().forEach(t => t.stop());
          return;
        }

        console.log("[SWAP] getUserMedia success:", newVideoTrack.label);

        // Re-fetch the current old track reference
        const currentOld = original.getVideoTracks()[0];

        const pc = peerRef && peerRef.current;
        let replaced = false;

        // Try to replace on peer first (safer for senders)
        if (pc && typeof pc.replaceTrack === "function" && currentOld) {
          try {
            pc.replaceTrack(currentOld, newVideoTrack, original);
            console.log("[SWAP] replaceTrack called");
            replaced = true;
          } catch (err) {
            console.warn("[SWAP] replaceTrack failed:", err);
            replaced = false;
          }
        }

        // If replaceTrack succeeded, remove and stop old track, then add new
        if (replaced) {
          try {
            console.log("[SWAP] Removing old track:", currentOld && currentOld.label);
            if (currentOld) {
              try {
                original.removeTrack(currentOld);
              } catch (e) {}
              try {
                currentOld.stop();
              } catch (e) {}
            }
          } catch (e) {}

          original.addTrack(newVideoTrack);
          console.log("[SWAP] Adding new track:", newVideoTrack.label);

          if (localVideoRef && localVideoRef.current) localVideoRef.current.srcObject = original;
          console.log("[SWAP] ✅ Camera swap completed (replaceTrack)");
        } else {
          // replaceTrack not available/failed: update local stream and fallback
          try {
            if (currentOld) {
              try {
                original.removeTrack(currentOld);
              } catch (e) {}
              try {
                currentOld.stop();
              } catch (e) {}
              console.log("[SWAP] Removing old track:", currentOld.label);
            }
          } catch (e) {}

          original.addTrack(newVideoTrack);
          console.log("[SWAP] Adding new track:", newVideoTrack.label);
          if (localVideoRef && localVideoRef.current) localVideoRef.current.srcObject = original;

          // Fallback: restart on iOS or when no replace capability
          if (isiOS()) {
            console.log('[SWAP] replaceTrack not usable — restarting call on iOS');
            if (window.hangup) window.hangup();
            if (window.call) window.call();
          } else {
            console.log('[SWAP] replaceTrack not supported and not iOS — best-effort local update done');
          }

          console.log("[SWAP] ✅ Camera swap attempted (fallback)");
        }

        // Stop temporary tracks that are not now in the original stream
        tmpStream.getTracks().forEach(t => {
          if (t !== newVideoTrack) t.stop();
        });
      } catch (err) {
        console.error("[useSwapCamera] error getting media:", err);
      }
    })();
  }, [selectedDeviceId, localVideoRef, originalStreamRef, peerRef]);

}
