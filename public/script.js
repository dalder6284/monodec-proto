let timeOffset = 0; // Offset in milliseconds (average RTT/2)
const rttHistory = [];
let manualOffset = 0; // Offset from the slider
const ws = new WebSocket("ws://" + window.location.host);
let isRecognized = false; // Flag to check if client is recognized by server
let bpm = 80;
let startTime = Date.now();

let syncAllowedUntil = 0; // Timestamp when we should stop syncing
let nextSyncStart = 0; // Timestamp for when the next sync period can start

let lastHeartbeat = Date.now(); // Tracks last received heartbeat
let isFlashing = true; // Controls whether blinking is allowed

function sendHeartbeat() {
    if (!isRecognized) return;

    ws.send(JSON.stringify({ type: "heartbeat_request" }));

    // Schedule the next heartbeat in 1-3 seconds (random)
    let nextHeartbeat = Math.random() * (3000 - 1000) + 1000;
    setTimeout(sendHeartbeat, nextHeartbeat);
}


function updateTime() {
    const now = new Date();

    // Local device time
    document.getElementById("local-time").textContent = "Device Time: " + now.toISOString().slice(11, 23);

    // Adjusted time based on server time + manual offset
    const adjustedTime = new Date(now.getTime() + timeOffset + manualOffset);
    document.getElementById("main-time").textContent = adjustedTime.toISOString().slice(11, 23);
}

function median(values) {
    if (values.length === 0) return 0;
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    return values.length % 2 === 0
        ? (values[middle - 1] + values[middle]) / 2
        : values[middle];
}

function calculateOffset() {
    if (rttHistory.length > 0) {
        const medianRTT = median(rttHistory);
        timeOffset = medianRTT / 2; // Use median RTT instead of mean
    }
}

// WebSocket logic
ws.onopen = () => {
    console.log("Connected to server as a client.");

    // Identify this WebSocket as a client
    ws.send(JSON.stringify({ type: "identify", role: "client" }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "info" && data.message === "You are now identified as a client.") {
        console.log("Client recognized by server.");
        isRecognized = true; // Set flag to true

        // Start sending heartbeats
        sendHeartbeat();
        // Start sending pings once recognized
        setInterval(() => {
            const now = Date.now();

            if (isRecognized) {
                if (now < syncAllowedUntil) {
                    // Sync is allowed, send time request
                    const timestamp = Date.now();
                    ws.send(JSON.stringify({ type: "time_request", timestamp }));
                } else if (now >= nextSyncStart) {
                    // Just exited a sync period or need to start a new one
                    syncAllowedUntil = now + 5000; // Allow sync for next 5 seconds
                    nextSyncStart = now + (Math.random() * (40 - 20) * 1000 + 20000); // Set next sync start in 20-40s
                    console.log(`Starting sync period for 5s. Next sync in ${Math.round((nextSyncStart - now) / 1000)}s.`);
                }
            }
        }, 500);
    } else if (data.type === "time_sync") {
        const now = Date.now();
        const rtt = now - data.clientTimestamp; // Calculate RTT

        // Keep last 10 RTT values
        if (rttHistory.length >= 10) {
            rttHistory.shift(); // Remove the oldest entry
        }
        rttHistory.push(rtt);

        // Calculate new offset
        calculateOffset();

        // Adjust main time to match server time + estimated network delay
        timeOffset = (data.serverTimestamp + timeOffset) - now;

        // Update RTT display
        document.getElementById("rtt-list").innerHTML = rttHistory.map(time => `${time} ms`).join("<br>");
    } else if (data.type == "bpm_update") {
        bpm = data.bpm;
        startTime = data.startTime;
        console.log(`BPM changed to ${bpm}.`);
        scheduleNextBlink();
    } else if (data.type === "heartbeat_response") {
        lastHeartbeat = Date.now(); // Update last received heartbeat time
        if (!isFlashing) {
            isFlashing = true; // Resume flashing if it was stopped
            console.log("Heartbeat restored. Resuming flashing.");
        }
    }
};

ws.onclose = () => {
    console.log("Disconnected from server.");
};

// Slider logic for manual adjustment
const slider = document.getElementById("offset-slider");
const sliderValue = document.getElementById("offset-value");

slider.addEventListener("input", (event) => {
    manualOffset = parseInt(event.target.value, 10);
    sliderValue.textContent = `${manualOffset} ms`;
});

// Update local and main time every millisecond
setInterval(updateTime, 1);


function scheduleNextBlink() {
    if (!isRecognized) return;

    const now = Date.now() + timeOffset + manualOffset;
    const beatInterval = (60 * 1000) / bpm; // Beat interval in milliseconds

    // Find the last beat number
    const n = Math.floor((now - startTime) / beatInterval);
    const nextBeatTime = startTime + (n + 1) * beatInterval;

    const delay = nextBeatTime - now;
    console.log(`Next blink in ${delay} ms`);

    setTimeout(() => {
        if (isFlashing) { // Blink only if heartbeats are still received
            blinkScreen();
        }
        scheduleNextBlink();
    }, delay);
}

// Function to blink the screen
function blinkScreen() {
    if (!isFlashing) return;

    document.body.style.backgroundColor = "white";

    setTimeout(() => {
        document.body.style.backgroundColor = "black";
    }, 100);
}


setInterval(() => {
    if (Date.now() - lastHeartbeat > 5000) {
        if (isFlashing) {
            isFlashing = false;
            console.log("No heartbeat detected for 5s. Stopping flashes.");
        }
    }
}, 500);