const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { joinRoom } = require("./rooms");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("room:join", (roomId) => {
    joinRoom(io, socket, roomId);
  });
});

server.listen(5000, () => {
  console.log("✅ Server listening on http://localhost:5000");
});
