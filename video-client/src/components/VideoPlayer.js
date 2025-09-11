import React, { useEffect, useState } from "react";

export default function VideoPlayer({ streamRef, muted = false, style }) {
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    const video = streamRef && streamRef.current;
    if (!video) return;

    const tryPlay = () => {
      // Attempt to play; some browsers (iOS Safari) block autoplay of
      // unmuted media and will reject the play() promise.
      if (!video) return;
      const p = video.play && video.play();
      if (!p || typeof p.then !== "function") {
        // play() not a promise in some old browsers — assume OK
        setNeedsInteraction(false);
        return;
      }
      p.then(() => {
        setNeedsInteraction(false);
      }).catch((err) => {
        // Autoplay blocked — require user interaction to start playback
        console.warn("Video play() rejected:", err);
        setNeedsInteraction(true);
      });
    };

    // Try immediately (in case stream is already attached)
    tryPlay();

    // Also try when metadata is loaded — good signal the srcObject is set
    video.addEventListener("loadedmetadata", tryPlay);

    return () => {
      video.removeEventListener("loadedmetadata", tryPlay);
    };
  }, [streamRef]);

  const handleUserStart = () => {
    const video = streamRef && streamRef.current;
    if (!video) return;
    video.play().then(() => setNeedsInteraction(false)).catch((err) => {
      console.warn("User-initiated play() failed:", err);
    });
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <video
        ref={streamRef}
        autoPlay
        muted={muted}
        playsInline
        style={{ ...style, backgroundColor: "black", display: "block" }}
      />

      {needsInteraction && (
        <div
          onClick={handleUserStart}
          role="button"
          tabIndex={0}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            color: "white",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.6)" }}>
            Tap to start video
          </div>
        </div>
      )}
    </div>
  );
}
