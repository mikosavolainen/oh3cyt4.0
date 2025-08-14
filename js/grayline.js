document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('grayline-map')) {
        const map = L.map('grayline-map').setView([20, 0], 2);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        const terminator = L.terminator().addTo(map);

        setInterval(function(){
            terminator.setTime();
        }, 60000); // Update every minute
    }
});
