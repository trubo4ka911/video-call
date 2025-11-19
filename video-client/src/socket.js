import { io } from "socket.io-client";

// Choose local or remote signaling URL based on flag
export const SIGNALING_URL =
  process.env.REACT_APP_IS_LOCALHOST === "true"
    ? process.env.REACT_APP_SERVER_URL_LOCAL
    : process.env.REACT_APP_SERVER_URL;

console.log("[socket] connecting to signaling:", SIGNALING_URL);
export const socket = io(SIGNALING_URL, {
  transports: ["websocket"],
  reconnectionAttempts: 3,
});
