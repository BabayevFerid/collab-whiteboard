import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Controls from "./Controls/Toolbar";

const socket = io("http://localhost:5000");

export default function CanvasStage({ roomId }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth - 60;
    canvas.height = window.innerHeight - 120;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctxRef.current = ctx;

    socket.emit("room:join", roomId);

    socket.on("canvas:init", (actions) => {
      actions.forEach((a) => drawFromAction(a));
    });

    socket.on("canvas:draw", (action) => {
      drawFromAction(action);
    });

    return () => {
      socket.off("canvas:init");
      socket.off("canvas:draw");
    };
  }, [roomId]);

  const drawFromAction = (action) => {
    const ctx = ctxRef.current;
    ctx.strokeStyle = action.color;
    ctx.beginPath();
    ctx.moveTo(action.from.x, action.from.y);
    ctx.lineTo(action.to.x, action.to.y);
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    const action = {
      tool,
      color,
      from: { x: ctxRef.current.lastX ?? x, y: ctxRef.current.lastY ?? y },
      to: { x, y },
    };

    drawFromAction(action);
    socket.emit("canvas:draw", action);

    ctxRef.current.lastX = x;
    ctxRef.current.lastY = y;
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    ctxRef.current.lastX = null;
    ctxRef.current.lastY = null;
  };

  return (
    <div>
      <Controls setTool={setTool} setColor={setColor} />
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="border rounded-lg shadow"
      />
    </div>
  );
}
