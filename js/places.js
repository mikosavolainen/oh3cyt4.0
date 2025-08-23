document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('places-map').setView([61.5, 25.5], 6); // Default view over Finland
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Define custom icons
    const potaIcon = L.icon({ iconUrl: '../images/pota_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
    const wwffIcon = L.icon({ iconUrl: '../images/wwff_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
    const sotaIcon = L.icon({ iconUrl: '../images/sota_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
    const iconMap = { POTA: potaIcon, WWFF: wwffIcon, SOTA: sotaIcon };

    let allPlaces = [];
    const markers = L.layerGroup().addTo(map);

    const programSelect = document.getElementById('program-select');
    const searchInput = document.getElementById('search-input');
    const gridLocatorInput = document.getElementById('grid-locator-input');
    const placesTableBody = document.querySelector('#places-table tbody');
    const suggestionsDatalist = document.getElementById('place-suggestions');

    const fetchData = async () => {
        try {
            const potaPromise = Papa.parsePromise('../data/all_parks_ext.csv', { download: true, header: true, skipEmptyLines: true });
            const wwffPromise = Papa.parsePromise('../data/wwff_directory.csv', { download: true, header: true, skipEmptyLines: true });
            const sotaPromise = Papa.parsePromise('../data/summitlist.csv', { download: true, header: true, skipEmptyLines: true });

            const [potaResults, wwffResults, sotaResults] = await Promise.all([potaPromise, wwffPromise, sotaPromise]);

            const potaData = potaResults.data.map(p => ({ program: 'POTA', ref: String(p.reference || ''), name: String(p.name || ''), locator: String(p.grid || ''), lat: p.latitude, lon: p.longitude }));
            const wwffData = wwffResults.data.map(p => ({ program: 'WWFF', ref: String(p.reference || ''), name: String(p.name || ''), locator: String(p.iaruLocator || ''), lat: p.latitude, lon: p.longitude }));
            const sotaData = sotaResults.data.map(p => ({ program: 'SOTA', ref: String(p.SummitCode || ''), name: String(p.SummitName || ''), locator: String(p.GridRef1 || ''), lat: p.Latitude, lon: p.Longitude }));

            allPlaces = [...potaData, ...wwffData, ...sotaData].filter(p => p.ref); // Filter out places without a reference
            populateSuggestions(allPlaces);
            displayPlaces(allPlaces);
        } catch (error) {
            console.error("Failed to fetch or parse CSV data:", error);
            placesTableBody.innerHTML = '<tr><td colspan="5">Error loading place data. Please check the data files and try again.</td></tr>';
        }
    };

    const populateSuggestions = (places) => {
        suggestionsDatalist.innerHTML = '';
        places.forEach(place => {
            if (place.ref) {
                const option = document.createElement('option');
                option.value = place.ref;
                suggestionsDatalist.appendChild(option);
            }
        });
    };

    const displayPlaces = (places) => {
        markers.clearLayers();
        placesTableBody.innerHTML = '';

        if (places.length === 0) {
            placesTableBody.innerHTML = '<tr><td colspan="5">No places found.</td></tr>';
            return;
        }

        places.forEach(place => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${place.program}</td>
                <td>${place.name} (${place.ref})</td>
                <td data-locator="${place.locator || ''}">${place.locator || 'N/A'}</td>
                <td></td>
                <td><button class="view-btn" data-ref="${place.ref}">View</button></td>`;
            placesTableBody.appendChild(row);

            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            let latLng;

            if (!isNaN(lat) && !isNaN(lon)) {
                latLng = [lat, lon];
            } else if (place.locator) {
                try {
                    latLng = maidenhead.toLatLng(place.locator);
                } catch (e) {
                    // Invalid locator, latLng remains undefined
                }
            }

            if (latLng) {
                place.latLng = latLng; // Store for later use
                const marker = L.marker(latLng, { icon: iconMap[place.program] || L.divIcon() })
                    .bindPopup(`<b>${place.program} - ${place.ref}</b><br>${place.name}`);
                markers.addLayer(marker);
            }
        });

        // Auto-zoom if there's only one result
        if (places.length === 1 && places[0].latLng) {
            map.setView(places[0].latLng, 13);
        }

        // Add event listeners to new buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ref = e.target.dataset.ref;
                const place = allPlaces.find(p => p.ref === ref);
                if (place && place.latLng) {
                    map.setView(place.latLng, 13);
                }
            });
        });

        updateHeadings();
    };

    const filterPlaces = () => {
        const selectedProgram = programSelect.value;
        const searchTerm = searchInput.value.toLowerCase();

        let filtered = allPlaces;

        if (selectedProgram !== 'all') {
            filtered = filtered.filter(p => p.program.toLowerCase() === selectedProgram);
        }

        if (searchTerm) {
            const exactMatch = filtered.find(p => p.ref.toLowerCase() === searchTerm);
            if (exactMatch) {
                filtered = [exactMatch];
            } else {
                filtered = filtered.filter(p =>
                    (p.ref && p.ref.toLowerCase().includes(searchTerm)) ||
                    (p.name && p.name.toLowerCase().includes(searchTerm))
                );
            }
        }

        displayPlaces(filtered);
    };

    const updateHeadings = () => {
        const userGrid = gridLocatorInput.value;
        let userLatLng = null;
        if (userGrid && userGrid.length >= 4) {
            try {
                userLatLng = maidenhead.toLatLng(userGrid);
            } catch (e) { /* ignore invalid user grid */ }
        }

        const rows = placesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const headingCell = row.cells[3];
            const viewButton = row.querySelector('.view-btn');
            if (!viewButton) return;

            const ref = viewButton.dataset.ref;
            const place = allPlaces.find(p => p.ref === ref);

            if (userLatLng && place && place.latLng) {
                const heading = calculateHeading(userLatLng, place.latLng);
                headingCell.textContent = `${heading.toFixed(0)}°`;
            } else {
                headingCell.textContent = '';
            }
        });
    };

    const calculateHeading = (from, to) => {
        const lat1 = toRadians(from[0]);
        const lon1 = toRadians(from[1]);
        const lat2 = toRadians(to[0]);
        const lon2 = toRadians(to[1]);

        const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
        const brng = toDegrees(Math.atan2(y, x));
        return (brng + 360) % 360;
    };

    const toRadians = (degrees) => degrees * Math.PI / 180;
    const toDegrees = (radians) => radians * 180 / Math.PI;

    Papa.parsePromise = (url, options) => {
        return new Promise((resolve, reject) => {
            Papa.parse(url, { ...options, complete: resolve, error: reject });
        });
    };

    programSelect.addEventListener('change', filterPlaces);
    searchInput.addEventListener('input', filterPlaces);
    gridLocatorInput.addEventListener('input', updateHeadings);

    fetchData();
});
