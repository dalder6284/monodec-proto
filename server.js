const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public")); // Serve frontend files

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        if (data.type === "ping") {
            ws.send(JSON.stringify({
                type: "pong",
                clientTimestamp: data.timestamp, // Echo original client time
                serverTimestamp: Date.now()      // Send server's current time
            }));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
