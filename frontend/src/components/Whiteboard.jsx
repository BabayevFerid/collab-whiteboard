import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Rect, Text, Image } from 'react-konva'
import Konva from 'konva'
import socket from '../lib/socket'
import Toolbar from './Toolbar'
import PresenceOverlay from './PresenceOverlay'
import { nanoid } from 'nanoid'

function useImageFromFile(file) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => setImg(image)
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return img
}

export default function Whiteboard({ roomId, user }) {
  const [objects, setObjects] = useState([]) // each object: { id, type, props }
  const stageRef = useRef()
  const layerRef = useRef()
  const [tool, setTool] = useState('select')
  const [color, setColor] = useState('#000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const isDrawingRef = useRef(false)
  const currentLineRef = useRef(null)
  const undoStackRef = useRef([])
  const [presence, setPresence] = useState({})
  const [fileForImage, setFileForImage] = useState(null)
  const uploadedImg = useImageFromFile(fileForImage)

  useEffect(() => {
    socket.connect()
    socket.emit('join-room', { roomId, user })

    socket.on('room-state', ({ objects: serverObjects, users }) => {
      setObjects(serverObjects || [])
      setPresence(users || {})
    })

    socket.on('action', ({ action }) => {
      applyRemoteAction(action)
    })

    socket.on('cursor', ({ socketId, cursor }) => {
      setPresence(prev => ({ ...prev, [socketId]: { ...prev[socketId], cursor } }))
    })

    socket.on('user-joined', ({ socketId, user }) => {
      setPresence(prev => ({ ...prev, [socketId]: { user } }))
    })

    socket.on('user-left', ({ socketId }) => {
      setPresence(prev => { const copy = { ...prev }; delete copy[socketId]; return copy })
    })

    return () => {
      socket.emit('leave-room', { roomId })
      socket.disconnect()
    }
  }, [roomId])

  function applyRemoteAction(action) {
    if (action.type === 'add') {
      setObjects(o => [...o, action.object])
    } else if (action.type === 'update') {
      setObjects(o => o.map(it => it.id === action.object.id ? action.object : it))
    } else if (action.type === 'delete') {
      setObjects(o => o.filter(it => it.id !== action.object.id))
    }
  }

  function broadcastAction(action) {
    // push to local history
    undoStackRef.current.push(action)
    // apply locally
    applyRemoteAction(action)
    // send to server
    socket.emit('action', { roomId, action })
  }

  // Drawing handlers
  function handleMouseDown(e) {
    if (tool !== 'brush') return
    isDrawingRef.current = true
    const pos = e.target.getStage().getPointerPosition()
    const id = nanoid()
    const line = { id, type: 'line', props: { points: [pos.x, pos.y], stroke: color, strokeWidth, globalCompositeOperation: 'source-over' } }
    currentLineRef.current = line
    // add as temporary
    setObjects(o => [...o, line])
  }

  function handleMouseMove(e) {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    // broadcast cursor
    socket.emit('cursor', { roomId, cursor: { x: pos.x, y: pos.y, tool, color } })

    if (!isDrawingRef.current || tool !== 'brush') return
    const point = [pos.x, pos.y]
    currentLineRef.current.props.points = [...currentLineRef.current.props.points, ...point]
    setObjects(o => o.map(it => it.id === currentLineRef.current.id ? currentLineRef.current : it))
  }

  function handleMouseUp(e) {
    if (tool !== 'brush') return
    isDrawingRef.current = false
    // finalize
    const obj = currentLineRef.current
    broadcastAction({ type: 'add', object: obj })
    currentLineRef.current = null
  }

  // Add rectangle example
  function addRect() {
    const id = nanoid()
    const rect = { id, type: 'rect', props: { x: 50, y: 50, width: 120, height: 80, fill: 'transparent', stroke: color, strokeWidth } }
    broadcastAction({ type: 'add', object: rect })
  }

  // Add text
  function addText() {
    const id = nanoid()
    const text = { id, type: 'text', props: { x: 60, y: 60, text: 'New text', fontSize: 20, fill: color } }
    broadcastAction({ type: 'add', object: text })
  }

  // Add image
  useEffect(() => {
    if (!uploadedImg) return
    const id = nanoid()
    const imgObj = { id, type: 'image', props: { x: 20, y: 20, width: uploadedImg.width / 2, height: uploadedImg.height / 2, src: uploadedImg.src } }
    broadcastAction({ type: 'add', object: imgObj })
    setFileForImage(null)
  }, [uploadedImg])

  // Export
  function exportPNG() {
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 })
    const link = document.createElement('a')
    link.download = `${roomId || 'whiteboard'}.png`
    link.href = uri
    link.click()
  }

  function handleDelete(id) {
    broadcastAction({ type: 'delete', object: { id } })
  }

  return (
    <div className="whiteboard-root">
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        onAddRect={addRect}
        onAddText={addText}
        onExport={exportPNG}
        onImageUpload={file => setFileForImage(file)}
      />

      <div className="stage-wrap">
        <Stage
          width={window.innerWidth}
          height={window.innerHeight - 80}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
        >
          <Layer ref={layerRef}>
            {objects.map(obj => {
              if (obj.type === 'line') {
                return <Line key={obj.id} points={obj.props.points} stroke={obj.props.stroke} strokeWidth={obj.props.strokeWidth} lineCap="round" lineJoin="round" />
              }
              if (obj.type === 'rect') {
                return <Rect key={obj.id} {...obj.props} draggable onDblClick={() => handleDelete(obj.id)} />
              }
              if (obj.type === 'text') {
                return <Text key={obj.id} {...obj.props} draggable onDblClick={() => handleDelete(obj.id)} />
              }
              if (obj.type === 'image') {
                const img = new window.Image()
                img.src = obj.props.src
                return <Image key={obj.id} image={img} {...obj.props} draggable onDblClick={() => handleDelete(obj.id)} />
              }
              return null
            })}
          </Layer>
        </Stage>
        <PresenceOverlay presence={presence} />
      </div>
    </div>
  )
}
