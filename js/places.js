document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('places-map').setView([61.5, 25.5], 5); // Default view over Finland
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let placesData = [];
    const markers = L.layerGroup().addTo(map);

    const searchInput = document.getElementById('search-input');
    const gridLocatorInput = document.getElementById('grid-locator-input');
    const placesTableBody = document.querySelector('#places-table tbody');

    // Fetch and parse CSV data
    Papa.parse('../data/places.csv', {
        download: true,
        header: true,
        complete: (results) => {
            placesData = results.data;
            displayPlaces(placesData);
        }
    });

    // Display places in the table and on the map
    const displayPlaces = (places) => {
        markers.clearLayers();
        placesTableBody.innerHTML = '';

        places.forEach(place => {
            if (place.grid_locator) {
                try {
                    const latLng = maidenhead.toLatLng(place.grid_locator);
                    const marker = L.marker(latLng).bindPopup(`<b>${place.name}</b><br>${place.grid_locator}`);
                    markers.addLayer(marker);

                    const row = document.createElement('tr');
                    const nameCell = document.createElement('td');
                    nameCell.textContent = place.name;
                    const gridCell = document.createElement('td');
                    gridCell.textContent = place.grid_locator;
                    const headingCell = document.createElement('td');
                    headingCell.textContent = ''; // Placeholder for heading
                    row.appendChild(nameCell);
                    row.appendChild(gridCell);
                    row.appendChild(headingCell);
                    placesTableBody.appendChild(row);
                } catch (e) {
                    console.error(`Invalid grid locator: ${place.grid_locator}`);
                }
            }
        });
    };

    // Filter places based on search input
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredPlaces = placesData.filter(place =>
            place.name.toLowerCase().includes(searchTerm) ||
            place.grid_locator.toLowerCase().includes(searchTerm) ||
            place.type.toLowerCase().includes(searchTerm)
        );
        displayPlaces(filteredPlaces);
    });

    // Calculate heading when grid locator is entered
    gridLocatorInput.addEventListener('input', () => {
        const userGrid = gridLocatorInput.value;
        if (userGrid.length >= 4) {
            try {
                const userLatLng = maidenhead.toLatLng(userGrid);
                updateHeadings(userLatLng);
            } catch (e) {
                // Invalid grid locator, clear headings
                updateHeadings(null);
            }
        } else {
            // Not a valid grid locator yet, clear headings
            updateHeadings(null);
        }
    });

    // Update headings in the table
    const updateHeadings = (userLatLng) => {
        const rows = placesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const gridCell = row.querySelector('td:nth-child(2)');
            const headingCell = row.querySelector('td:nth-child(3)');
            if (userLatLng && gridCell) {
                try {
                    const placeGrid = gridCell.textContent;
                    const placeLatLng = maidenhead.toLatLng(placeGrid);
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

    // Calculate heading between two points
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

    const toRadians = (degrees) => {
        return degrees * Math.PI / 180;
    };

    const toDegrees = (radians) => {
        return radians * 180 / Math.PI;
    };
});
