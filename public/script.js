let timeOffset = 0; // Offset in milliseconds (average RTT/2)
const rttHistory = [];
const ws = new WebSocket("ws://" + window.location.host);

function updateTime() {
    const now = new Date();

    // Local device time
    document.getElementById("local-time").textContent = "Device Time: " + now.toISOString().slice(11, 23);

    // Adjusted time based on server time + offset
    const adjustedTime = new Date(now.getTime() + timeOffset);
    document.getElementById("main-time").textContent = adjustedTime.toISOString().slice(11, 23);
}

function calculateOffset() {
    if (rttHistory.length > 0) {
        const avgRTT = rttHistory.reduce((sum, val) => sum + val, 0) / rttHistory.length;
        timeOffset = avgRTT / 2; // Offset = Half of average RTT
    }
}

// WebSocket logic
ws.onopen = () => {
    console.log("Connected to server");
    setInterval(() => {
        const timestamp = Date.now();
        ws.send(JSON.stringify({ type: "ping", timestamp }));
    }, 500); // Send request every 500ms
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "pong") {
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
    }
};

ws.onclose = () => {
    console.log("Disconnected from server");
};

// Update local and main time every millisecond
setInterval(updateTime, 1);
