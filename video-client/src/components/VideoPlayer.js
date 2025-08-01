import React from "react";

export default function VideoPlayer({ streamRef, muted, style }) {
  return <video ref={streamRef} autoPlay muted={muted} style={style} />;
}
