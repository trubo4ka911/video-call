import React from "react";

export default function IncomingCallModal({ onAccept, onDecline }) {
  return (
    <div className="modal">
      <p>Incoming call…</p>
      <button onClick={onAccept}>Accept</button>
      <button onClick={onDecline}>Decline</button>
    </div>
  );
}
