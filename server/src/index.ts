import "dotenv/config";
import { pool } from "./db";
import Websocket, { WebSocketServer } from "ws";
import {
    Awareness,
    applyAwarenessUpdate,
    encodeAwarenessUpdate,
    removeAwarenessStates,
} from "y-protocols/awareness.js";
import * as Y from "yjs";

const DOCUMENT_UPDATE = 0;
const AWARENESS_UPDATE = 1;

async function startServer() {
    await pool.query("SELECT 1");
    console.log("Database connected");

    const wss = new WebSocketServer({
        port: 8080,
    });

    type Room = {
        doc: Y.Doc;
        awareness: Awareness;
    };

    type AwarenessChange = {
        added: number[];
        updated: number[];
        removed: number[];
    };

    const rooms =  new Map<string, Room>();
    const clientRooms = new Map<Websocket, string>();
    const socketAwarenessIDs = new Map<Websocket, Set<number>>();

    wss.on("connection", (socket, request) => {
        console.log("Client connected");

        const url = new URL(
            request.url ?? "/",
            "http://localhost:8080"
        );

        const roomID = String(url.searchParams.get("room"));
        const room = getRoom(roomID);
        const serverDoc = room.doc;

        clientRooms.set(socket, roomID);

        const trackAwarenessUpdate = (
            { added, updated, removed }: AwarenessChange,
            origin: unknown
        ) => {
            if (origin !== socket) {
                return;
            }

            const clientIDs = socketAwarenessIDs.get(socket) ?? new Set<number>();

            for (const clientID of [...added, ...updated]) {
                clientIDs.add(clientID);
            }

            for (const clientID of [...removed]) {
                clientIDs.delete(clientID);
            }

            socketAwarenessIDs.set(socket, clientIDs);
        }

        room.awareness.on("update", trackAwarenessUpdate);

        const currentState = Y.encodeStateAsUpdate(serverDoc);

        socket.send(frameMessage(DOCUMENT_UPDATE, currentState));
        
        const awarenessClientIDs = [...room.awareness.getStates().keys()]
        .filter((clientID) => clientID !== room.awareness.clientID);

        if (awarenessClientIDs.length > 0) {
            const currentAwareness = encodeAwarenessUpdate(
                room.awareness,
                awarenessClientIDs,
            );
            
            socket.send(
                frameMessage(AWARENESS_UPDATE, currentAwareness)
            );
        }

        socket.on("message", (data) => {
            const message = new Uint8Array(data as Buffer);
            const type = message[0];
            const update = message.slice(1);

            if (type === DOCUMENT_UPDATE) {
                Y.applyUpdate(serverDoc, update);
            }

            if (type === AWARENESS_UPDATE) {
                applyAwarenessUpdate(room.awareness, update, socket);
            }

            for (const client of wss.clients) {
                if (client !== socket &&
                    clientRooms.get(client) === roomID &&
                    client.readyState === Websocket.OPEN
                ) {
                    client.send(message);
                }
            }
        });

        socket.on("close", () => {
            const clientIDs = socketAwarenessIDs.get(socket);
            room.awareness.off("update", trackAwarenessUpdate);

            if (clientIDs) {
                removeAwarenessStates(
                    room.awareness,
                    [...clientIDs],
                    socket,
                )

                const update = encodeAwarenessUpdate(
                    room.awareness,
                    [...clientIDs],
                );

                const message = frameMessage(AWARENESS_UPDATE, update);

                for (const client of wss.clients) {
                    if (
                        client !== socket &&
                        clientRooms.get(client) === roomID &&
                        client.readyState === Websocket.OPEN
                    ) {
                        client.send(message);
                    }
                }
            }
            socketAwarenessIDs.delete(socket);
            clientRooms.delete(socket);
            console.log("Client  disconnected");
        });
    });

    function getRoom(roomID: string) {
        let room = rooms.get(roomID);

        if (!room) {
            const doc = new Y.Doc();
            room = {
                doc,
                awareness: new Awareness(doc),
            }

            rooms.set(roomID, room);
        }

        return room;
    }

    function frameMessage(type: number, update: Uint8Array) {
        const message = new Uint8Array(update.byteLength + 1);

        message[0] = type;
        message.set(update, 1);

        return message;
    }

    console.log("Server running on ws://localhost:8080");
}

startServer().catch((error) => {
    console.log("Failed to start server:", error);
    process.exit(1);
});