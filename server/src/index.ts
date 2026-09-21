import Websocket, { WebSocketServer } from "ws";
import * as Y from "yjs";

const wss = new WebSocketServer({
    port: 8080,
});

const docs =  new Map<string, Y.Doc>();
const clientRooms = new Map<Websocket, string>();

wss.on("connection", (socket, request) => {
    console.log("Client connected");

    const url = new URL(
        request.url ?? "/",
        "http://localhost:8080"
    );

    const roomID= String(url.searchParams.get("room"));
    const serverDoc = getDocument(roomID);
    clientRooms.set(socket, roomID);

    const currentState = Y.encodeStateAsUpdate(serverDoc);

    socket.send(currentState);

    socket.on("message", (data) => {
        const update = new Uint8Array(data as Buffer);

        Y.applyUpdate(serverDoc, update);

        for (const client of wss.clients) {
            if (client !== socket &&
                clientRooms.get(client) === roomID &&
                client.readyState === Websocket.OPEN
            ) {
                client.send(update);
            }
        }
    });

    socket.on("close", () => {
        clientRooms.delete(socket);
        console.log("Client  disconnected");
    });
});

function getDocument(roomID: string) {
    let doc = docs.get(roomID);

    if (!doc) {
        doc = new Y.Doc();
        docs.set(roomID, doc);
    }

    return doc;
}

console.log("Server running on ws://localhost:8080");