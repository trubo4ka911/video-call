// server.js - Simple WebRTC signaling server for video calls
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const cors = require("cors");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// In-memory map: userId → socketId
const userSockets = {};

// --- Express Middleware ---
app.use(cors());
app.use(express.json());

// REST endpoint: return list of users for login
app.get("/api/users", (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, "data/users.json"));
  res.json(JSON.parse(data));
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

  /**
   * Map userId to this socket and broadcast online users
   * @param {{userId: string}} param0
   */
  function handleIdentify({ userId }) {
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
    // Find the caller’s userId by matching this socket.id
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
});
