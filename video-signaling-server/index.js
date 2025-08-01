const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("🔗 new socket:", socket.id);

  // 1) Relay call requests
  socket.on("call-request", ({ to }) => {
    io.to(to).emit("call-request", { from: socket.id });
  });

  socket.on("call-accept", ({ to }) => {
    io.to(to).emit("call-accept", { from: socket.id });
  });

  socket.on("call-decline", ({ to, reason }) => {
    io.to(to).emit("call-decline", { from: socket.id, reason });
  });

  // 2) Relay all Simple-Peer signals
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });
});

server.listen(9001, () => console.log("🚀 Signaling server on :9001"));
