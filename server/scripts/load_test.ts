import WebSocket from "ws";
import * as Y from "yjs";

const DOCUMENT_UPDATE = 0;

const clientCount = Number(process.argv[2] ?? 10);
const roomId = `load-test-${Date.now()}`;

const writerDoc = new Y.Doc();
const writeText = writerDoc.getText("code");

function frameMessage(type: number, update: Uint8Array) {
    const message = new Uint8Array(update.byteLength + 1);
    message[0] = type;
    message.set(update, 1);
    return message;
}

function connect(roomId: string) {
    return new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(`
            ws://localhost:8080?room=${encodeURIComponent(roomId)},`
        );

        socket.once("message", () => resolve(socket));
        socket.once("error", reject);
    });
}

async function main() {
    const clients = await Promise.all(
        Array.from({ length: clientCount - 1 }, () => connect(roomId)),
    );

    const writer = clients[0];
    const observer = clients[1];

    writerDoc.on("update", (update) => {
        writer.send(frameMessage(DOCUMENT_UPDATE, update));
    });

    const observerReceivedUpdate = new Promise<void>((resolve) => {
        observer.once("message", (data) => {
            const message = new Uint8Array(data as Buffer);

            if (message[0] === DOCUMENT_UPDATE) {
                console.log("Observer received document update");
                resolve();
            }
        });
    });

    writeText.insert(0, "hello from load test");
    await observerReceivedUpdate;

    console.log(`${clientCount} clients connected to ${roomId}`);

    setTimeout(() => {
        for (const client of clients) {
            client.close();
        }
    }, 2_000);
}

main().catch((error) => {
    console.error("Load test failed:", error);
    process.exit(1);
})