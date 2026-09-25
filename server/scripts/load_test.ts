import WebSocket from "ws";
import * as Y from "yjs";

const DOCUMENT_UPDATE = 0;

const clientCount = Number(process.argv[2] ?? 10);
const roomId = `load-test-${Date.now()}`;

const writerDoc = new Y.Doc();
const writerText = writerDoc.getText("code");

const deliveryTimes: number[] = [];

function percentile(times: number[], percent: number) {
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percent) - 1;

    return sorted[index];
}

function frameMessage(type: number, update: Uint8Array) {
    const message = new Uint8Array(update.byteLength + 1);
    message[0] = type;
    message.set(update, 1);
    return message;
}

function connect(roomId: string) {
    return new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(
            `ws://localhost:8080?room=${encodeURIComponent(roomId)}`,
        );

        socket.once("message", () => resolve(socket));
        socket.once("error", reject);
    });
}

async function main() {
    const writer = await connect(roomId);
    const observers = await Promise.all(
        Array.from({ length: clientCount - 1 }, () => connect(roomId)),
    );

    const clients = [writer, ...observers];

    writerDoc.on("update", (update) => {
        writer.send(frameMessage(DOCUMENT_UPDATE, update));
    });

    for (let index = 0; index < 100; index++) {
        const observerReceivedUpdate = observers.map((observer) => {
            return new Promise<void>((resolve) => {
                observer.once("message", () => resolve());
            });
        });

        const started_at = performance.now();
        writerText.insert(writerText.length, `update-${index}\n`);

        await Promise.all(observerReceivedUpdate);

        deliveryTimes.push(performance.now() - started_at);
    }

    const total = deliveryTimes.reduce((sum, time) => sum + time, 0);
    const average = total / deliveryTimes.length;

    const p50 = percentile(deliveryTimes, 0.5);
    const p95 = percentile(deliveryTimes, 0.95);
    const max = Math.max(...deliveryTimes);

    console.log({
        clientCount,
        averageDeliveryMs: average,
        p50DeliveryMs: p50,
        p95DeliveryMs: p95,
        maxDeliveryMs: max,
    });

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