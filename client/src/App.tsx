import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

function App() {
  const socketRef = useRef<WebSocket | null>(null);

  const [code, setCode] = useState(
    `function hello() {
      console.log("Hello, Converge!");
    }`
  );

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true)
    }

    socket.onmessage = (event) => {
      setCode(event.data)
    };

    socket.onclose = () => {
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  function handleCodeChange(value: string | undefined) {
    if (value === undefined) {
      return;
    }

    setCode(value);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(value);
    }
  }

  return (
    <main>
      <p>
        Status: {connected ? "Connected" : "Disconnected"}
      </p>

      <Editor
        height="80vh"
        language="javascript"
        value={code}
        onChange={handleCodeChange}
      />
    </main>
  );
}

export default App;