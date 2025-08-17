import React from 'react'

export default function Toolbar({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth, onAddRect, onAddText, onExport, onImageUpload }) {
  return (
    <div className="toolbar">
      <button onClick={() => setTool('select') } className={tool==='select'?'active':''}>Select</button>
      <button onClick={() => setTool('brush') } className={tool==='brush'?'active':''}>Brush</button>
      <button onClick={onAddRect}>Rect</button>
      <button onClick={onAddText}>Text</button>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} />
      <input type="range" min={1} max={30} value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} />
      <button onClick={onExport}>Export PNG</button>
      <label className="upload-btn">Upload Image
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onImageUpload(e.target.files[0])} />
      </label>
    </div>
  )
}
