// server.js - Simple WebRTC signaling server for video calls
const fs = require("fs");
const path = require("path");
const express = require("express");
const https = require("https");
const cors = require("cors");
const socketIo = require("socket.io");

const app = express();
let server;

const http = require("http");
server = http.createServer(app);
console.log("[signaling] starting in HTTP mode (FORCE_HTTP=true)");

// Build allowed rawOrigin list from environment (comma-separated) or fall back to defaults
const rawOrigin = process.env.SIGNALING_CORS_ORIGINS || "*"; // not in use

const io = socketIo(server, {
  cors: {
    origin: rawOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory map: SearchUser → socketId
//TODO: Move session management to Redis DB for scalability
const userSockets = {};

// --- Express Middleware ---
app.use(cors());
app.use(express.json());

// Load management and mobile users
const mgtUsers = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/OR_MGT_USERS_SAMPLE.json"))
);
const mobUsers = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data/OR_MOB_USERS_SAMPLE.json"))
);

// Helper: filter by SearchUser if query param present
function filterBySearchUser(users, search) {
  if (!search) return users;
  return users.filter(
    (u) =>
      u.SearchUser && u.SearchUser.toLowerCase().includes(search.toLowerCase())
  );
}

// Endpoint: management users
app.get("/api/users/management", (req, res) => {
  const search = req.query.search || "";
  res.json(filterBySearchUser(mgtUsers, search));
});

// Endpoint: mobile users
app.get("/api/users/mobile", (req, res) => {
  const search = req.query.search || "";
  res.json(filterBySearchUser(mobUsers, search));
});

// Debug endpoint: report signaling protocol and port
app.get("/debug/signaling", (req, res) => {
  const proto = process.env.FORCE_HTTP === "true" ? "http" : "https";
  const port = process.env.PORT || 9001;
  res.json({ proto, port, corsOrigins: rawOrigin });
});

// --- Socket.IO Signaling Logic ---
io.on("connection", (socket) => {
  console.log("☸ Socket connected:", socket.id);

  // Handle user identification and presence
  socket.on("identify", handleIdentify);
  socket.on("disconnect", handleDisconnect);
  // WebRTC signaling events
  socket.on("call-user", handleCallUser);
  socket.on("answer-call", handleAnswerCall);
  socket.on("ice-candidate", handleIceCandidate);
  socket.on("hangup-call", handleHangupCall);

  /**
   * Relay hangup event to the other peer
   * @param {{toUserId: string, fromUserId: string}}
   */
  function handleHangupCall({ toUserId, fromUserId }) {
    const targetSid = userSockets[toUserId];
    if (targetSid) {
      io.to(targetSid).emit("call-hangup", { fromUserId });
    }
  }

  /**
   * Map SearchUser to this socket and broadcast online users
   * @param {{ userId: string }} param0
   */
  function handleIdentify({ userId }) {
    // userId is SearchUser for both DBs
    userSockets[userId] = socket.id;
    console.log(`User ${userId} is now mapped to socket ${socket.id}`);
    io.emit("online-list", Object.keys(userSockets));
  }

  /**
   * Remove user from map on disconnect and broadcast online users
   */
  function handleDisconnect() {
    for (const [uid, sid] of Object.entries(userSockets)) {
      if (sid === socket.id) {
        delete userSockets[uid];
        console.log(`User ${uid} disconnected`);
        break;
      }
    }
    io.emit("online-list", Object.keys(userSockets));
  }

  /**
   * Relay WebRTC offer from caller to callee
   * @param {{toUserId: string, signalData: any}}
   */
  function handleCallUser({ toUserId, signalData }) {
    const targetSocket = userSockets[toUserId];
    if (!targetSocket) return;
    // Find the caller’s SearchUser by matching this socket.id
    const fromUserId = Object.entries(userSockets).find(
      ([uid, sid]) => sid === socket.id
    )?.[0];
    io.to(targetSocket).emit("incoming-call", {
      fromUserId,
      signalData,
    });
  }

  /**
   * Relay WebRTC answer from callee to caller
   * @param {{toUserId: string, signalData: any, fromUserId: string}}
   */
  function handleAnswerCall({ toUserId, signalData, fromUserId }) {
    const targetSid = userSockets[toUserId];
    if (targetSid) {
      io.to(targetSid).emit("call-answered", { fromUserId, signalData });
    }
  }

  /**
   * Relay ICE candidate between peers
   * @param {{toUserId: string, candidate: any, fromUserId: string}}
   */
  function handleIceCandidate({ toUserId, candidate, fromUserId }) {
    const targetSid = userSockets[toUserId];
    if (targetSid) {
      io.to(targetSid).emit("ice-candidate", { fromUserId, candidate });
    }
  }
});

// --- Start server ---
const PORT = process.env.PORT || 9001;
server.listen(PORT, () => {
  console.log(`Signaling server listening on http://localhost:${PORT}`);
  console.log(`[signaling] allowed CORS rawOrigin:`, rawOrigin);
});
// .then()
// .catch((e) => {
//   console.error("Failed to start server:", e);
//   process.exit(1);
// });
