// Initialize map
const map = L.map('map').setView([40.7128, -74.0060], 13); // New York City

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Click to add marker
let marker;
map.on('click', function(e) {
  if (marker) map.removeLayer(marker);
  marker = L.marker(e.latlng).addTo(map);
});

// Search by location name using Nominatim
async function searchLocation() {
  const query = document.getElementById('search-box').value;
  if (!query) return;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data && data.length > 0) {
    const { lat, lon } = data[0];
    map.setView([lat, lon], 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    alert("Location not found.");
  }
}
