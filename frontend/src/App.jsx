import React, { useState } from 'react'
import Whiteboard from './components/Whiteboard'

export default function App() {
  const [roomId, setRoomId] = useState(() => 'room-1')
  const [name, setName] = useState(() => 'Guest-' + Math.floor(Math.random() * 1000))

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">Collaborative Whiteboard</div>
        <div className="controls">
          <input value={roomId} onChange={e => setRoomId(e.target.value)} />
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
      </header>
      <main>
        <Whiteboard roomId={roomId} user={{ name }} />
      </main>
    </div>
  )
}
