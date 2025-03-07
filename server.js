const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

let bpm = 80;
let startTime = Date.now(); // Start time for BPM calculation

// Store connections separately
const clients = new Set();  // Regular clients
const admins = new Set();   // Admin clients

function broadcastBPM() {
    const bpmMessage = JSON.stringify({
        type: "bpm_update",
        bpm: bpm,
        startTime: startTime
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(bpmMessage);
        }
    });

    console.log(`Sent BPM update: ${bpm} BPM, Start Time: ${startTime}`);
}

setInterval(() => {
    if (clients.size > 0) {
        broadcastBPM();
    }
}, 5000); // Send every 5 seconds

function handleCommand(data) {
    if (data.type !== "command" || data.password !== "admin123") {
        return "Unauthorized or invalid command.";
    }

    switch (data.command) {
        case "setbpm":
            if (data.value) {
                bpm = parseInt(data.value, 10);
                startTime = Date.now(); // Reset start time for new BPM
                broadcastBPM();
                console.log(`BPM changed to ${bpm}`);
                return `BPM changed to ${bpm}`;
            }
            return "Usage: setbpm <number>";
            
        case "show":
            return `Current BPM: ${bpm}, Start Time: ${startTime}`;

        default:
            return "Unknown command. Available: setbpm <number>, show";
    }
}

wss.on("connection", (ws) => {
    ws.role = "unknown";
    console.log("New connection detected.");

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            // IDENTIFY ADMIN CONNECTIONS
            if (data.type === "identify" && data.role === "admin" && data.password === "admin123") {
                ws.role = "admin";
                admins.add(ws);
                console.log("Admin connected.");
                ws.send(JSON.stringify({ type: "info", message: "You are now identified as admin." }));
                return;
            }

            // IDENTIFY REGULAR CLIENT CONNECTIONS
            if (data.type === "identify" && data.role === "client") {
                ws.role = "client";
                clients.add(ws);
                console.log("Client connected.");
                ws.send(JSON.stringify({ type: "info", message: "You are now identified as a client." }));
                return;
            }

            // HANDLE ADMIN COMMANDS
            if (ws.role === "admin" && data.type === "command") {
                const response = handleCommand(data);
                ws.send(JSON.stringify({ type: "response", message: response }));
                return;
            }

            // HANDLE CLIENT MESSAGES
            if (ws.role === "client" && data.type === "time_request") {
                console.log(`Received ping from client: RTT=${Date.now() - data.timestamp} ms`);
                ws.send(JSON.stringify({ type: "time_sync", clientTimestamp: data.timestamp, serverTimestamp: Date.now() }));
                return;
            }

            if (ws.role === "client" && data.type === "heartbeat_request") {
                ws.send(JSON.stringify({ type: "heartbeat_response" }));
                return;
            }

        } catch (err) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid JSON format" }));
        }
    });

    ws.on("close", () => {
        if (ws.role === "admin") admins.delete(ws);
        if (ws.role === "client") clients.delete(ws);
        console.log(`${ws.role} disconnected.`);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));


