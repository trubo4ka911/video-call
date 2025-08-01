import React from "react";

export default function CallButton({ status, onCall, onCancel }) {
  if (status === "idle") {
    return <button onClick={onCall}>Call someone</button>;
  }
  if (status === "calling") {
    return <button onClick={onCancel}>Cancel Call</button>;
  }
  return null;
}
