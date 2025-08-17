import React from "react";

export default function Toolbar({ setTool, setColor }) {
  return (
    <div className="flex gap-4 p-4 bg-gray-100 rounded-xl shadow mb-4">
      <button
        onClick={() => setTool("pen")}
        className="px-3 py-1 bg-blue-500 text-white rounded"
      >
        ✏️ Pen
      </button>
      <button
        onClick={() => setTool("eraser")}
        className="px-3 py-1 bg-red-500 text-white rounded"
      >
        🧽 Eraser
      </button>
      <input
        type="color"
        onChange={(e) => setColor(e.target.value)}
        className="w-10 h-10 border rounded"
      />
    </div>
  );
}
