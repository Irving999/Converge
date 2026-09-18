import Websocket, { WebSocketServer } from "ws";
import * as Y from "yjs";

const wss = new WebSocketServer({
    port: 8080,
});

const serverDoc = new Y.Doc();

wss.on("connection", (socket) => {
    console.log("Client connected");

    const currentState = Y.encodeStateAsUpdate(serverDoc);

    socket.send(currentState);

    socket.on("message", (data) => {
        const update = new Uint8Array(data as Buffer);

        Y.applyUpdate(serverDoc, update);

        for (const client of wss.clients) {
            if (client !== socket &&
                client.readyState === Websocket.OPEN
            ) {
                client.send(update);
            }
        }
    });

    socket.on("close", () => {
        console.log("Client  disconnected");
    });
});

console.log("Server running on ws://localhost:8080");