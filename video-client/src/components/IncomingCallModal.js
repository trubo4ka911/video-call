import "./IncomingCallModal.css";
import React from "react";

export default function IncomingCallModal({ onAccept, onDecline }) {
  return (
    <div className="incoming-modal">
      <div className="incoming-content">
        <p>Incoming call…</p>
        <div className="incoming-buttons">
          <button onClick={onAccept}>Accept</button>
          <button onClick={onDecline}>Decline</button>
        </div>
      </div>
    </div>
  );
}
