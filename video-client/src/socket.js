import { io } from "socket.io-client";

// Restored hard-coded signaling URL (previous working value).
export const SIGNALING_URL = process.env.REACT_APP_SERVER_URL;

console.log("[socket] connecting to signaling:", SIGNALING_URL);
export const socket = io(SIGNALING_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 3,
});
