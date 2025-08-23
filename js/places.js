document.addEventListener('DOMContentLoaded', () => {
    const debugLog = document.getElementById('debug-log');
    const logToScreen = (message) => {
        if (debugLog) {
            debugLog.innerHTML += message + '\n';
        }
        console.log(message);
    };

    try {
        logToScreen('Script start: DOMContentLoaded event fired.');

        // --- MAP INITIALIZATION ---
        const urlParams = new URLSearchParams(window.location.search);
        const latParam = parseFloat(urlParams.get('lat')) || 61.5;
        const lonParam = parseFloat(urlParams.get('lon')) || 25.5;
        const zoomParam = parseInt(urlParams.get('zoom'), 10) || 6;
        const MIN_ZOOM_TO_SHOW = 8;
        logToScreen('URL parameters parsed.');

        const map = L.map('places-map').setView([latParam, lonParam], zoomParam);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        logToScreen('Map initialized.');

        // --- ICONS ---
        const potaIcon = L.icon({ iconUrl: '../images/pota_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
        const wwffIcon = L.icon({ iconUrl: '../images/wwff_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
        const sotaIcon = L.icon({ iconUrl: '../images/sota_icon.svg', iconSize: [32, 32], iconAnchor: [16, 16] });
        const iconMap = { POTA: potaIcon, WWFF: wwffIcon, SOTA: sotaIcon };
        logToScreen('Map icons created.');

        // --- STATE & DOM ELEMENTS ---
        let allPlaces = [];
        const markers = L.layerGroup().addTo(map);
        const programSelect = document.getElementById('program-select');
        const searchInput = document.getElementById('search-input');
        const gridLocatorInput = document.getElementById('grid-locator-input');
        const placesTableBody = document.querySelector('#places-table tbody');
        const suggestionsDatalist = document.getElementById('place-suggestions');
        const mapMessage = document.getElementById('map-message');
        const statusPota = document.querySelector('#status-pota span');
        const statusWwff = document.querySelector('#status-wwff span');
        const statusSota = document.querySelector('#status-sota span');
        logToScreen('DOM elements selected.');

        // --- DATA FETCHING ---
        const fetchData = async () => {
            logToScreen('fetchData: Starting data fetch...');
            const sources = [
                { name: 'POTA', url: '../data/all_parks_ext.csv', statusEl: statusPota, mapper: p => ({ program: 'POTA', ref: String(p.reference || ''), name: String(p.name || ''), locator: String(p.grid || ''), lat: p.latitude, lon: p.longitude }) },
                { name: 'WWFF', url: '../data/wwff_directory.csv', statusEl: statusWwff, mapper: p => ({ program: 'WWFF', ref: String(p.reference || ''), name: String(p.name || ''), locator: String(p.iaruLocator || ''), lat: p.latitude, lon: p.longitude }) },
                { name: 'SOTA', url: '../data/summitlist.csv', statusEl: statusSota, mapper: p => ({ program: 'SOTA', ref: String(p.SummitCode || ''), name: String(p.SummitName || ''), locator: String(p.GridRef1 || ''), lat: p.Latitude, lon: p.Longitude }) }
            ];

            let loadedPlaces = [];
            let hasErrors = false;

            for (const source of sources) {
                logToScreen(`fetchData: Fetching ${source.name}...`);
                try {
                    const results = await Papa.parsePromise(source.url, { download: true, header: true, skipEmptyLines: true });
                    if (results.errors.length > 0) {
                        throw new Error(`Parsing errors in ${source.name}: ${JSON.stringify(results.errors)}`);
                    }
                    const mappedData = results.data.map(source.mapper);
                    loadedPlaces.push(...mappedData);
                    source.statusEl.textContent = 'Loaded';
                    source.statusEl.className = 'status-success';
                    logToScreen(`fetchData: ${source.name} loaded successfully.`);
                } catch (error) {
                    logToScreen(`fetchData: ERROR loading ${source.name}. Details: ${error.message}`);
                    source.statusEl.textContent = 'Failed';
                    source.statusEl.className = 'status-error';
                    hasErrors = true;
                }
            }
            logToScreen('fetchData: All files processed.');

            allPlaces = loadedPlaces
                .filter(p => p.ref)
                .map(place => {
                    const lat = parseFloat(place.lat);
                    const lon = parseFloat(place.lon);
                    if (!isNaN(lat) && !isNaN(lon)) {
                        place.latLng = [lat, lon];
                    } else if (place.locator) {
                        try {
                            place.latLng = maidenhead.toLatLng(place.locator);
                        } catch (e) { /* Invalid locator */ }
                    }
                    return place;
                });
            logToScreen('fetchData: Place data mapped and sanitized.');

            populateSuggestions(allPlaces);
            filterAndDisplay();

            if (hasErrors) {
                placesTableBody.innerHTML = '<tr><td colspan="5">Warning: One or more data files failed to load. Results may be incomplete.</td></tr>';
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
            logToScreen('Suggestions populated.');
        };

        const displayPlaces = (places) => {
            markers.clearLayers();
            placesTableBody.innerHTML = '';

            if (places.length === 0) {
                if (map.getZoom() >= MIN_ZOOM_TO_SHOW) {
                     placesTableBody.innerHTML = '<tr><td colspan="5">No places found matching your criteria.</td></tr>';
                }
                return;
            }

            const mapBounds = map.getBounds();
            places.forEach(place => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${place.program}</td>
                    <td>${place.name} (${place.ref})</td>
                    <td data-locator="${place.locator || ''}">${place.locator || 'N/A'}</td>
                    <td></td>
                    <td><button class="view-btn" data-ref="${place.ref}">View</button></td>`;
                placesTableBody.appendChild(row);

                const isVisibleOnMap = place.latLng && mapBounds.contains(place.latLng);
                if (isVisibleOnMap) {
                    const marker = L.marker(place.latLng, { icon: iconMap[place.program] || L.divIcon() })
                        .bindPopup(`<b>${place.program} - ${place.ref}</b><br>${place.name}`);
                    markers.addLayer(marker);
                }
            });

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

        const filterAndDisplay = () => {
            logToScreen('filterAndDisplay: Updating view...');
            const selectedProgram = programSelect.value;
            const searchTerm = searchInput.value.toLowerCase();

            if (map.getZoom() < MIN_ZOOM_TO_SHOW) {
                markers.clearLayers();
                placesTableBody.innerHTML = '<tr><td colspan="5">Zoom in to see places.</td></tr>';
                mapMessage.textContent = 'Zoom in to see places';
                mapMessage.style.display = 'block';
                return;
            }
            mapMessage.style.display = 'none';

            let filtered = allPlaces;

            if (selectedProgram !== 'all') {
                filtered = filtered.filter(p => p.program.toLowerCase() === selectedProgram);
            }

            if (searchTerm) {
                const exactMatch = filtered.find(p => p.ref.toLowerCase() === searchTerm);
                if (exactMatch) {
                    filtered = [exactMatch];
                    if (exactMatch.latLng) {
                        map.setView(exactMatch.latLng, 13);
                    }
                } else {
                    filtered = filtered.filter(p =>
                        (p.ref && p.ref.toLowerCase().includes(searchTerm)) ||
                        (p.name && p.name.toLowerCase().includes(searchTerm))
                    );
                }
            }

            displayPlaces(filtered);
            logToScreen(`filterAndDisplay: View updated. Displaying ${filtered.length} results in table.`);
        };

        const updateHeadings = () => {
            const userGrid = gridLocatorInput.value;
            let userLatLng = null;
            if (userGrid && userGrid.length >= 4) {
                try {
                    userLatLng = maidenhead.toLatLng(userGrid);
                } catch (e) {}
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

        const updateURL = () => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            const newUrl = `${window.location.pathname}?lat=${center.lat.toFixed(6)}&lon=${center.lng.toFixed(6)}&zoom=${zoom}`;
            history.pushState({}, '', newUrl);
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

        Papa.parsePromise = (url, options) => new Promise((resolve, reject) => Papa.parse(url, { ...options, complete: resolve, error: reject }));

        programSelect.addEventListener('change', filterAndDisplay);
        searchInput.addEventListener('input', filterAndDisplay);
        gridLocatorInput.addEventListener('input', updateHeadings);
        map.on('moveend', () => {
            updateURL();
            filterAndDisplay();
        });
        map.on('zoomend', () => {
            updateURL();
            filterAndDisplay();
        });
        logToScreen('Event listeners attached.');

        fetchData();
    } catch (error) {
        logToScreen('FATAL ERROR: ' + error.message);
        logToScreen('Stack: ' + error.stack);
    }
});
