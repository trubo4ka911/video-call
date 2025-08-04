import React from "react";

export default function VideoPlayer({ streamRef, muted = false, style }) {
  return (
    <video
      ref={streamRef}
      autoPlay
      muted={muted}
      playsInline
      style={{ ...style, backgroundColor: "black" }}
    />
  );
}
