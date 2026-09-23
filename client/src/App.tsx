import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor";

import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness.js";

const DOCUMENT_UPDATE = 0;
const AWARENESS_UPDATE = 1;

type AwarenessChange = {
  added: number[];
  updated: number[];
  removed: number[];
};

function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const [editorInstance, setEditorInstance] =
    useState<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);

    docRef.current = doc;
    awarenessRef.current = awareness;

    awareness.setLocalStateField("user", {
      name: "Alice",
      color: "#ff0000",
    });

    const socket = new WebSocket("ws://localhost:8080?room=demo");
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;

    socket.onopen = () => {
      const update = encodeAwarenessUpdate(
        awareness,
        [awareness.clientID]
      );

      socket.send(frameMessage(AWARENESS_UPDATE, update));
    }

    awareness.on(
      "update",
      ({ added, updated, removed }: AwarenessChange, origin: unknown) => {
      if (origin === "remote") {
        return;
      }

      const changedClients = [...added, ...updated, ...removed];

      const update = encodeAwarenessUpdate(
        awareness,
        changedClients,
      );

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(frameMessage(AWARENESS_UPDATE, update));
      }
    });

    doc.on("update", (update, origin) => {
      if (origin === "remote") {
        return;
      }

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(frameMessage(DOCUMENT_UPDATE, update));
      }
    });

    socket.onmessage = (event) => {
      const message = new Uint8Array(event.data);
      const type = message[0];
      const update = message.slice(1);

      if (type === DOCUMENT_UPDATE) {
        Y.applyUpdate(doc, update, "remote")
      }

      if (type === AWARENESS_UPDATE) {
        applyAwarenessUpdate(awareness, update, "remote");
      }
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
    const awareness = awarenessRef.current;

    if (!awareness) {
      return;
    }

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorInstance]),
      awareness,
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

function frameMessage(type: number, update: Uint8Array) {
  const message = new Uint8Array(update.byteLength + 1);

  message[0] = type;
  message.set(update, 1);

  return message;
}

export default App;