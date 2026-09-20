import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor";

import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";

function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  const [editorInstance, setEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();

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

    return () => {
      socket.close();
      doc.destroy();
    };
  }, []);

  useEffect(() => {
    if (!editorInstance || !docRef.current) {
      return;
    }

    const model = editorInstance.getModel();

    if (!model) {
      return;
    }

    const yText = docRef.current.getText("code");

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorInstance])
    );

    return () => {
      binding.destroy();
    };
  }, [editorInstance]);

  return (
    <main>
      <Editor
        height="80vh"
        language="typescript"
        theme="vs-dark"
        defaultValue=""
        onMount={(editor) => {
          setEditorInstance(editor);
        }}
      />
    </main>
  );
}

export default App;