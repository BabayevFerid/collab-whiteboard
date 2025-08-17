import React from 'react'

export default function PresenceOverlay({ presence }) {
  return (
    <div className="presence-overlay">
      {Object.entries(presence).map(([socketId, info]) => (
        <div key={socketId} className="presence-item">
          <div className="user-name">{info.user?.name || 'Anon'}</div>
          {info.cursor && <div className="cursor-dot" style={{ left: info.cursor.x, top: info.cursor.y }}>{info.user?.name?.[0]}</div>}
        </div>
      ))}
    </div>
  )
}
