import { TimeSync } from "./sync.js";

const FLASH_DURATION = 50;
let timeSync = new TimeSync(updateMainTime);
let mainTime = new Date();
let nextBeatTime = 0;
let isFlashing = false;

function updateTime() {
    const now = new Date();
    mainTime = timeSync.getCurrentTime();
    nextBeatTime = timeSync.getNextBeatTime();

    document.getElementById("local-time").textContent = "Device Time: " + now.toISOString().slice(11, 23);
    document.getElementById("main-time").textContent = "Synced Time: " + mainTime.toISOString().slice(11, 23);

    requestAnimationFrame(updateTime);
}

function updateBackground() {
    const now = mainTime.getTime();

    if (nextBeatTime > 0 && now >= nextBeatTime - FLASH_DURATION && now < nextBeatTime) {
        document.body.style.backgroundColor = "rgb(255, 255, 255)";
        isFlashing = true;
    } else if (isFlashing && now >= nextBeatTime) {
        isFlashing = false;
        fadeToBlack();
        nextBeatTime += 60_000 / 80; // Move to next beat locally
    }

    requestAnimationFrame(updateBackground);
}

function fadeToBlack() {
    document.body.style.backgroundColor = "black";
}

// Switch from sync to beat mode
document.getElementById("switch-mode").addEventListener("click", () => {
    timeSync.switchToBeatMode();
    document.getElementById("sync-status").textContent = "Mode: Beat Phase";
});

// Start updates
requestAnimationFrame(updateTime);
requestAnimationFrame(updateBackground);

function updateMainTime(_, rttHistory, nextBeat, mode) {
    nextBeatTime = nextBeat;
    document.getElementById("rtt-list").innerHTML = rttHistory.map(time => `${time} ms`).join("<br>");
    document.getElementById("sync-status").textContent = mode === "sync" ? "Mode: Sync Phase" : "Mode: Beat Phase";
}
