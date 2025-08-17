const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Simple in-memory store: { roomId: { objects: [], cursors: {}, users: {} } }
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { objects: [], cursors: {}, users: {}, history: [] });
  }
  return rooms.get(roomId);
}

// REST endpoint to create/join a room (could return token)
app.post('/api/room', (req, res) => {
  const { roomId } = req.body;
  getOrCreateRoom(roomId || 'default');
  res.json({ ok: true, roomId: roomId || 'default' });
});

io.on('connection', socket => {
  console.log('socket connected', socket.id);

  socket.on('join-room', ({ roomId, user }) => {
    socket.join(roomId);
    const room = getOrCreateRoom(roomId);
    room.users[socket.id] = user;

    // send initial state
    socket.emit('room-state', { objects: room.objects, users: room.users });

    // notify others about new user
    socket.to(roomId).emit('user-joined', { socketId: socket.id, user });
  });

  socket.on('leave-room', ({ roomId }) => {
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (room) {
      delete room.users[socket.id];
      delete room.cursors[socket.id];
      socket.to(roomId).emit('user-left', { socketId: socket.id });
    }
  });

  // Receiving drawing actions (add/update/delete object)
  socket.on('action', ({ roomId, action }) => {
    // action: { type: 'add'|'update'|'delete', object }
    const room = getOrCreateRoom(roomId);
    // naive persistence: push to objects / update by id
    if (action.type === 'add') {
      room.objects.push(action.object);
      room.history.push(action);
    } else if (action.type === 'update') {
      const idx = room.objects.findIndex(o => o.id === action.object.id);
      if (idx >= 0) room.objects[idx] = action.object;
      room.history.push(action);
    } else if (action.type === 'delete') {
      const idx = room.objects.findIndex(o => o.id === action.object.id);
      if (idx >= 0) room.objects.splice(idx, 1);
      room.history.push(action);
    }

    // broadcast to others
    socket.to(roomId).emit('action', { action });
  });

  // Cursor presence
  socket.on('cursor', ({ roomId, cursor }) => {
    const room = getOrCreateRoom(roomId);
    room.cursors[socket.id] = cursor; // { x, y, tool, color }
    socket.to(roomId).emit('cursor', { socketId: socket.id, cursor });
  });

  // Undo/redo request
  socket.on('undo', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.history.length) return;
    const last = room.history.pop();
    // naive undo: if last.type === 'add' -> remove, if 'delete' -> re-add, if 'update' -> cannot revert without snapshot
    if (last.type === 'add') {
      const idx = room.objects.findIndex(o => o.id === last.object.id);
      if (idx >= 0) room.objects.splice(idx, 1);
      io.in(roomId).emit('action', { action: { type: 'delete', object: last.object } });
    } else if (last.type === 'delete') {
      room.objects.push(last.object);
      io.in(roomId).emit('action', { action: { type: 'add', object: last.object } });
    }
    // For update, production code must store snapshots per update to allow revert.
  });

  socket.on('disconnecting', () => {
    console.log('disconnecting', socket.id);
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const room = rooms.get(roomId);
      if (room) {
        delete room.users[socket.id];
        delete room.cursors[socket.id];
        socket.to(roomId).emit('user-left', { socketId: socket.id });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server listening on', PORT));
