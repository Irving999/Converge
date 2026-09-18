import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  const [text, setText] = useState("");

  useEffect(() => {
    const doc = new Y.Doc();
    const yText = doc.getText("code");

    docRef.current = doc;

    const socket = new WebSocket("ws://localhost:8080");

    socket.binaryType = "arraybuffer";

    socketRef.current = socket;

    doc.on("update", (update, origin) => {
      if (origin === "remote") {
        return;
      }

      if (socket.readyState === WebSocket.OPEN) {
        const message = new Uint8Array(update.byteLength);
        message.set(update);
        socket.send(message);
      }
    });

    socket.onmessage = (event) => {
      const update = new Uint8Array(event.data);

      Y.applyUpdate(doc, update, "remote");
    };

    yText.observe(() => {
      setText(yText.toString());
    })

    return () => {
      socket.close();
      doc.destroy();
    }
  }, []);

  function addHello() {
    const doc = docRef.current;

    if (!doc) {
      return;
    }

    const yText = doc.getText("code");
    
    yText.insert(yText.length, "hello");
  }

  return (
    <main>
      <button onClick={addHello}>
        Add hello
      </button>
      <p>{text}</p>
    </main>
  );
}

export default App;