// rooms/index.js
const rooms = {}; // roomId -> { users: Set(socketId), state: [] }

function joinRoom(io, socket, roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { users: new Set(), state: [] };
  }
  rooms[roomId].users.add(socket.id);

  // əvvəlki canvas vəziyyətini yeni qoşulana göndər
  socket.emit("canvas:init", rooms[roomId].state);

  socket.join(roomId);

  socket.on("canvas:draw", (action) => {
    rooms[roomId].state.push(action);
    socket.to(roomId).emit("canvas:draw", action);
  });

  socket.on("disconnect", () => {
    if (rooms[roomId]) {
      rooms[roomId].users.delete(socket.id);
      if (rooms[roomId].users.size === 0) {
        delete rooms[roomId]; // boş otaq silinir
      }
    }
  });
}

module.exports = { joinRoom };
