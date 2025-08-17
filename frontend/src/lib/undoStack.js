export default function createUndoStack() {
  const stack = []
  return {
    push(action) { stack.push(action) },
    pop() { return stack.pop() },
    clear() { stack.length = 0 },
    get length() { return stack.length }
  }
}
