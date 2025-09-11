import { io } from "socket.io-client";

// Restored hard-coded signaling URL (previous working value).
export const SIGNALING_URL = "https://10.82.20.126:9001";
console.log("[socket] connecting to signaling:", SIGNALING_URL);
export const socket = io(SIGNALING_URL, { transports: ["websocket"], reconnectionAttempts: 3 });
