import "dotenv/config";
import { pool } from "./db";
import { createServer , IncomingMessage } from "node:http";
import { createProject } from "./projects";
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

type Room = {
    doc: Y.Doc;
    awareness: Awareness;
};

type AwarenessChange = {
    added: number[];
    updated: number[];
    removed: number[];
};

const rooms = new Map<string, Room>();
const clientRooms = new Map<Websocket, string>();
const socketAwarenessIDs = new Map<Websocket, Set<number>>();

async function startServer() {
    const server = createServer(async (request, response) => {
        if (request.method === "POST" && request.url === "/api/projects") {
            try {
                const body = await readJsonBody(request);

                if (
                    typeof body !== "object" ||
                    body === null ||
                    !("name" in body) ||
                    typeof body.name !== "string" ||
                    body.name.trim() === ""
                ) {
                    response.writeHead(400, {
                        "Content-Type": "application/json",
                    });
                    response.end(JSON.stringify({ error: "A project name is required" }));
                    return;
                }

                const project = await createProject(body.name.trim());

                response.writeHead(201, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify(project));
            } catch (error) {
                console.error("Failed to create project", error);

                response.writeHead(500, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify({ error: "Failed to create project" }));
            }
    }
        response.writeHead(404);
        response.end();
    });

    const wss = new WebSocketServer({ server });

    wss.on("connection", async (socket, request) => {
        console.log("Client connected");

        const url = new URL(
            request.url ?? "/",
            "http://localhost:8080"
        );

        const roomID = String(url.searchParams.get("room"));
        const room = await getRoom(roomID);
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

        socket.on("message", async (data) => {
            const message = new Uint8Array(data as Buffer);
            const type = message[0];
            const update = message.slice(1);

            if (type === DOCUMENT_UPDATE) {
                try {
                    await insertUpdate(roomID, update);
                    Y.applyUpdate(serverDoc, update);
                } catch (error) {
                    console.error("Failed to save document changes", error);
                    return;
                }
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

    server.listen(8080, () => {
        console.log("Server running on http://localhost:8080");
        console.log("Websocket server running on ws://localhost:8080");
    })
}

async function getRoom(roomID: string): Promise<Room> {
    const existingRoom = rooms.get(roomID);

    if (existingRoom) {
        return existingRoom;
    }

    await ensureRoomExists(roomID);

    const doc = new Y.Doc();

    const result = await pool.query<{ update_data: Buffer }>(
        `
          SELECT update_data
          FROM document_updates
          WHERE room_id = $1
          ORDER BY id ASC 
        `,
        [roomID],
    );

    for (const row of result.rows) {
        Y.applyUpdate(doc, new Uint8Array(row.update_data), "database");
    }

    const room = {
        doc,
        awareness: new Awareness(doc),
    }

    rooms.set(roomID, room);

    return room;
}

function frameMessage(type: number, update: Uint8Array) {
    const message = new Uint8Array(update.byteLength + 1);

    message[0] = type;
    message.set(update, 1);

    return message;
}

async function ensureRoomExists(roomId: string) {
    await pool.query(
        `
          INSERT INTO rooms (id)
          VALUES ($1)
          ON CONFLICT (id) DO NOTHING
        `,
        [roomId],
    );
}

async function insertUpdate(room_id: string, data: Uint8Array) {
    await pool.query(
        `
          INSERT INTO document_updates (room_id, update_data)
          VALUES ($1, $2)
        `,
        [room_id, Buffer.from(data)]
    );
}

async function readJsonBody(request: import("node:http").IncomingMessage) {
    const chunks: Buffer[] = [];

    for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
    }

    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

startServer().catch((error) => {
    console.log("Failed to start server:", error);
    process.exit(1);
});