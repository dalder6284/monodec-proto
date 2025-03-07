export class TimeSync {
    constructor(updateCallback) {
        this.ws = new WebSocket("ws://" + window.location.host);
        this.mode = "sync"; // Start in synchronization mode
        this.rttHistory = [];
        this.adjustedBaseTime = new Date();
        this.lastAdjustmentTime = Date.now();
        this.nextBeatTime = 0;
        this.beatInterval = 0;
        this.updateCallback = updateCallback;
        this.pingInterval = null;

        this.ws.onopen = () => {
            console.log("Connected to server");
            this.startSync();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (this.mode === "sync" && data.type === "sync-response") {
                // Handle time synchronization
                const now = Date.now();
                const rtt = now - data.clientTimestamp;

                if (this.rttHistory.length >= 10) {
                    this.rttHistory.shift();
                }
                this.rttHistory.push(rtt);

                const avgRTT = this.rttHistory.reduce((sum, val) => sum + val, 0) / this.rttHistory.length;
                this.adjustedBaseTime = new Date(data.serverTimestamp + avgRTT / 2);
                this.lastAdjustmentTime = now;

                if (this.updateCallback) {
                    this.updateCallback(this.getCurrentTime(), this.rttHistory, this.nextBeatTime, this.mode);
                }
            }

            if (this.mode === "beat" && data.type === "beat-info") {
                // Handle beat synchronization
                this.nextBeatTime = data.nextBeatTimestamp;
                this.beatInterval = data.beatInterval;

                if (this.updateCallback) {
                    this.updateCallback(this.getCurrentTime(), this.rttHistory, this.nextBeatTime, this.mode);
                }
            }
        };

        this.ws.onclose = () => {
            console.log("Disconnected from server");
        };
    }

    startSync() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
            if (this.mode === "sync") {
                const timestamp = Date.now();
                this.ws.send(JSON.stringify({ type: "sync-request", timestamp }));
            }
        }, 500);
    }

    switchToBeatMode() {
        this.mode = "beat";
        clearInterval(this.pingInterval); // Stop pinging
        this.ws.send(JSON.stringify({ type: "beat-request" }));
    }

    getCurrentTime() {
        const elapsedTime = Date.now() - this.lastAdjustmentTime;
        return new Date(this.adjustedBaseTime.getTime() + elapsedTime);
    }

    getNextBeatTime() {
        if (this.mode === "sync") return 0; // No beat yet in sync mode
        return this.nextBeatTime;
    }
}
