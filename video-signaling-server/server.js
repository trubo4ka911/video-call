// server.js
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

// In‐memory map: userId → socketId
const userSockets = {};

/** MIDDLEWARE **/
app.use(cors());
app.use(express.json()); // for parsing application/json

// expose the user directory
app.get("/api/users", (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, "data/users.json"));
  res.json(JSON.parse(data));
});

/** SOCKET.IO SIGNALING **/
io.on("connection", (socket) => {
  console.log("☸ Socket connected:", socket.id);

  // 1) Client identifies itself with a logical userId
  // client must emit “identify”
  socket.on("identify", ({ userId }) => {
    userSockets[userId] = socket.id;
    console.log(`User ${userId} is now mapped to socket ${socket.id}`);
    io.emit("online-list", Object.keys(userSockets));
  });

  // 2) When a user disconnects, remove them from the map
  socket.on("disconnect", () => {
    for (const [uid, sid] of Object.entries(userSockets)) {
      if (sid === socket.id) {
        delete userSockets[uid];
        console.log(`User ${uid} disconnected`);
        break;
      }
    }
    io.emit("online-list", Object.keys(userSockets));
  });

  // 3) WebRTC offer/answer/ICE signaling
  //    All messages carry a `toUserId` so we can lookup the socket
  // your existing signaling handlers can now reference userSockets[toUserId]
  socket.on("call-user", ({ toUserId, signalData }) => {
    const targetSocket = userSockets[toUserId];
    if (!targetSocket) return;

    // find the caller’s userId by matching this socket.id
    const fromUserId = Object.entries(userSockets).find(
      ([uid, sid]) => sid === socket.id
    )?.[0];

    io.to(targetSocket).emit("incoming-call", {
      fromUserId,
      signalData,
    });
  });

  socket.on("answer-call", ({ toUserId, signalData, fromUserId }) => {
    const targetSid = userSockets[toUserId];
    if (targetSid) {
      io.to(targetSid).emit("call-answered", { fromUserId, signalData });
    }
  });

  socket.on("ice-candidate", ({ toUserId, candidate, fromUserId }) => {
    const targetSid = userSockets[toUserId];
    if (targetSid) {
      io.to(targetSid).emit("ice-candidate", { fromUserId, candidate });
    }
  });
});

// Start server
const PORT = process.env.PORT || 9001;
server.listen(PORT, () => {
  console.log(`💬 Signaling server listening on http://localhost:${PORT}`);
});
