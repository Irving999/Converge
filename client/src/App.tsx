import { useEffect, useRef, useState } from "react";

function App() {
  const socketRef = useRef<WebSocket | null>(null);

  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected to server");
      setConnected(true)
    }

    socket.onmessage = (event) => {
      console.log("Received: ", event.data);

      setMessages((previousMessages) => [
        ...previousMessages,
        event.data,
      ]);
    };

    socket.onclose = () => {
      console.log("Disconnected from server");
      setConnected(false);
    };

    return () => {
      socket.close();
    };
  }, []);

  function sendMessage() {
    if (!socketRef.current) {
      return;
    }

    if (socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(message);
    setMessage("");
  }

  return (
    <main>
      <p>
        Status: {connected ? "Connected" : "Disconnected"}
      </p>

      <input
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Enter a message"
      />

      <button onClick={sendMessage}>
        Send
      </button>

      <h2>Messages</h2>

      {messages.map((msg, index) => (
        <p key={index}>{msg}</p>
      ))}
    </main>
  );
}

export default App;