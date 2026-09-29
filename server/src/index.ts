import "dotenv/config";
import { pool } from "./db";
import { createFile, listFiles, getFile } from "./files";
import { createServer , IncomingMessage } from "node:http";
import { createProject, listProjects } from "./projects";
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

type DocumentSession = {
    doc: Y.Doc;
    awareness: Awareness;
};

type AwarenessChange = {
    added: number[];
    updated: number[];
    removed: number[];
};

const documents = new Map<string, DocumentSession>();
const clientFiles = new Map<Websocket, string>();
const socketAwarenessIDs = new Map<Websocket, Set<number>>();

async function startServer() {
    const server = createServer(async (request, response) => {
        const url = new URL(
            request.url ?? "/",
            "http://localhost:8080",
        );
        
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

            return;
        }

        if (request.method === "GET" && request.url === "/api/projects") {
            const projects = await listProjects();

            response.writeHead(200, {
                "Content-Type": "application/json",
            });
            response.end(JSON.stringify(projects));
            return;
        }

        const filesRoute = url.pathname.match(
            /^\/api\/projects\/([^/]+)\/files$/,
        );

        if (request.method === "POST" && filesRoute) {
            const projectId = decodeURIComponent(filesRoute[1]);

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
                    response.end(JSON.stringify({ error: "A file name is required" }));
                    return;
                }

                const language =
                    "language" in body &&
                    typeof body.language === "string" &&
                    body.language.trim() !== ""
                        ? body.language.trim()
                        : "typescript";

                const file = await createFile(
                    projectId,
                    body.name.trim(),
                    language,
                );

                response.writeHead(201, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify(file));
            } catch (error) {
                console.error("Failed to create file", error);

                response.writeHead(500, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify({ error: "Failed to create file" }));
            }

            return;
        }

        if (request.method === "GET" && filesRoute) {
            const projectId = decodeURIComponent(filesRoute[1]);
            const files = await listFiles(projectId);

            response.writeHead(200, {
                "Content-Type": "application/json",
            });
            response.end(JSON.stringify(files));
            return;
        }

        const fileRoute = url.pathname.match(
            /^\/api\/files\/([^/]+)$/,
        );

        if (request.method === "GET" && fileRoute) {
            const fileId = decodeURIComponent(fileRoute[1]);

            try {
                const file = await getFile(fileId);

                if (!file) {
                    response.writeHead(404, {
                        "Content-Type": "application/json",
                    });
                    response.end(JSON.stringify({ error: "File not found" }));
                    return;
                }

                response.writeHead(200, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify(file));
            } catch (error) {
                console.error("Failed to load file", error);

                response.writeHead(500, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify({ error: "Failed to load file" }));
            }
            
            return;
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

        const fileId = url.searchParams.get("file");

        if (!fileId) {
            socket.close(1008, "A file ID is required");
            return;
        }

        if (!(await getFile(fileId))) {
            socket.close(1008, "File not found");
            return;
        }

        const document = await getDocument(fileId);
        const serverDoc = document.doc;

        clientFiles.set(socket, fileId);

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

        document.awareness.on("update", trackAwarenessUpdate);

        const currentState = Y.encodeStateAsUpdate(serverDoc);

        socket.send(frameMessage(DOCUMENT_UPDATE, currentState));
        
        const awarenessClientIDs = [...document.awareness.getStates().keys()]
        .filter((clientID) => clientID !== document.awareness.clientID);

        if (awarenessClientIDs.length > 0) {
            const currentAwareness = encodeAwarenessUpdate(
                document.awareness,
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
                    await insertUpdate(fileId, update);
                    Y.applyUpdate(serverDoc, update);
                } catch (error) {
                    console.error("Failed to save document changes", error);
                    return;
                }
            }

            if (type === AWARENESS_UPDATE) {
                applyAwarenessUpdate(document.awareness, update, socket);
            }

            for (const client of wss.clients) {
                if (client !== socket &&
                    clientFiles.get(client) === fileId &&
                    client.readyState === Websocket.OPEN
                ) {
                    client.send(message);
                }
            }
        });

        socket.on("close", () => {
            const clientIDs = socketAwarenessIDs.get(socket);
            document.awareness.off("update", trackAwarenessUpdate);

            if (clientIDs) {
                removeAwarenessStates(
                    document.awareness,
                    [...clientIDs],
                    socket,
                )

                const update = encodeAwarenessUpdate(
                    document.awareness,
                    [...clientIDs],
                );

                const message = frameMessage(AWARENESS_UPDATE, update);

                for (const client of wss.clients) {
                    if (
                        client !== socket &&
                        clientFiles.get(client) === fileId &&
                        client.readyState === Websocket.OPEN
                    ) {
                        client.send(message);
                    }
                }
            }
            socketAwarenessIDs.delete(socket);
            clientFiles.delete(socket);
            console.log("Client  disconnected");
        });
    });

    server.listen(8080, () => {
        console.log("Server running on http://localhost:8080");
        console.log("Websocket server running on ws://localhost:8080");
    })
}

async function getDocument(fileId: string): Promise<DocumentSession> {
    const existingDocument = documents.get(fileId);

    if (existingDocument) {
        return existingDocument;
    }

    const doc = new Y.Doc();

    const result = await pool.query<{ update_data: Buffer }>(
        `
          SELECT update_data
          FROM document_updates
          WHERE file_id = $1
          ORDER BY id ASC 
        `,
        [fileId],
    );

    for (const row of result.rows) {
        Y.applyUpdate(doc, new Uint8Array(row.update_data), "database");
    }

    const document = {
        doc,
        awareness: new Awareness(doc),
    }

    documents.set(fileId, document);

    return document;
}

function frameMessage(type: number, update: Uint8Array) {
    const message = new Uint8Array(update.byteLength + 1);

    message[0] = type;
    message.set(update, 1);

    return message;
}

async function insertUpdate(fileId: string, data: Uint8Array) {
    await pool.query(
        `
          INSERT INTO document_updates (file_id, update_data)
          VALUES ($1, $2)
        `,
        [fileId, Buffer.from(data)]
    );
}

async function readJsonBody(request: IncomingMessage) {
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
