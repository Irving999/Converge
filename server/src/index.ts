import Websocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({
    port: 8080,
});

wss.on("connection", (socket) => {
    console.log("Client connected");

    socket.on("message", (data) => {
        const message = data.toString();

        console.log("Received:", message);

        for (const client of wss.clients) {
            if (client !== socket &&
                client.readyState === Websocket.OPEN
            ) {
                client.send(message);
            }
        }
    });

    socket.on("close", () => {
        console.log("Client disconnected");
    });
});

console.log("WebSocket server running on ws://localhost:8080");