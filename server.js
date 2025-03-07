const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public")); // Serve frontend files

const BPM = 80;
const BEAT_INTERVAL = 60_000 / BPM; // Milliseconds per beat
const START_TIME = Date.now(); // Global beat start time

function getNextBeatTime(currentTime) {
    const beatsSinceStart = Math.floor((currentTime - START_TIME) / BEAT_INTERVAL);
    return START_TIME + (beatsSinceStart + 1) * BEAT_INTERVAL;
}

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "sync-request") {
            // Send time sync data
            const now = Date.now();
            ws.send(JSON.stringify({
                type: "sync-response",
                clientTimestamp: data.timestamp,
                serverTimestamp: now
            }));
        }

        if (data.type === "beat-request") {
            // Send beat phase timing info
            const now = Date.now();
            ws.send(JSON.stringify({
                type: "beat-info",
                nextBeatTimestamp: getNextBeatTime(now),
                beatInterval: BEAT_INTERVAL
            }));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
