function updateClock() {
    const clockElement = document.getElementById('utc-clock');
    if (clockElement) {
        const now = new Date();
        const utcString = now.toUTCString().split(' ')[4];
        clockElement.textContent = `UTC ${utcString}`;
    }
}

setInterval(updateClock, 1000);
updateClock();
