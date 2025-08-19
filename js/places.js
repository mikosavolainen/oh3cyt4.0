document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('places-map').setView([61.5, 25.5], 5); // Default view over Finland
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

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

            allPlaces = [...potaData, ...wwffData, ...sotaData];
            populateSuggestions(allPlaces);
            displayPlaces(allPlaces);
        } catch (error) {
            console.error("Failed to fetch or parse CSV data:", error);
            placesTableBody.innerHTML = '<tr><td colspan="4">Error loading place data. Please check the data files and try again.</td></tr>';
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

        places.forEach(place => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${place.program}</td>
                <td>${place.name} (${place.ref})</td>
                <td data-locator="${place.locator || ''}">${place.locator || 'N/A'}</td>
                <td></td>`;
            placesTableBody.appendChild(row);

            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);

            if (!isNaN(lat) && !isNaN(lon)) {
                const latLng = [lat, lon];
                const marker = L.marker(latLng).bindPopup(`<b>${place.program} - ${place.ref}</b><br>${place.name}`);
                markers.addLayer(marker);
            } else if (place.locator) {
                try {
                    const latLng = maidenhead.toLatLng(place.locator);
                    const marker = L.marker(latLng).bindPopup(`<b>${place.program} - ${place.ref}</b><br>${place.name}`);
                    markers.addLayer(marker);
                } catch (e) {
                    // This locator is invalid, do nothing. The table already shows the locator or N/A.
                }
            }
        });

        // A small delay to ensure the DOM is updated before calculating headings
        setTimeout(() => {
            const userGrid = gridLocatorInput.value;
            if (userGrid && userGrid.length >= 4) {
                try {
                    const userLatLng = maidenhead.toLatLng(userGrid);
                    updateHeadings(userLatLng);
                } catch (e) {
                    updateHeadings(null);
                }
            } else {
                updateHeadings(null);
            }
        }, 0);
    };

    const filterPlaces = () => {
        const selectedProgram = programSelect.value;
        const searchTerm = searchInput.value.toLowerCase();

        let filtered = allPlaces;

        if (selectedProgram !== 'all') {
            filtered = filtered.filter(p => p.program.toLowerCase() === selectedProgram);
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                (p.ref && p.ref.toLowerCase().includes(searchTerm)) ||
                (p.name && p.name.toLowerCase().includes(searchTerm))
            );
        }

        displayPlaces(filtered);
    };

    const updateHeadings = (userLatLng) => {
        const rows = placesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const locatorCell = row.cells[2];
            const headingCell = row.cells[3];
            const locator = locatorCell.dataset.locator;

            if (userLatLng && locator) {
                try {
                    const placeLatLng = maidenhead.toLatLng(locator);
                    const heading = calculateHeading(userLatLng, placeLatLng);
                    headingCell.textContent = `${heading.toFixed(0)}°`;
                } catch (e) {
                    headingCell.textContent = '';
                }
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
    gridLocatorInput.addEventListener('input', () => {
        const userGrid = gridLocatorInput.value;
        if (userGrid.length >= 4) {
            try {
                const userLatLng = maidenhead.toLatLng(userGrid);
                updateHeadings(userLatLng);
            } catch (e) {
                updateHeadings(null);
            }
        } else {
            updateHeadings(null);
        }
    });

    fetchData();
});
