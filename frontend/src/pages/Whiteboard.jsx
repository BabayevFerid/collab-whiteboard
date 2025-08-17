import React from "react";
import CanvasStage from "../components/CanvasStage";

export default function Whiteboard() {
  const roomId = "default-room"; // istəsən URL-dən oxuya bilərsən

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Collaborative Whiteboard</h1>
      <CanvasStage roomId={roomId} />
    </div>
  );
}

