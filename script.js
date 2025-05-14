let map;
let marker;
let currentBaseLayer;

// Base map layers
const layers = {
  streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery © Esri & NASA'
  }),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data: © OpenTopoMap contributors'
  })
};

// Initialize the map
map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  zoomControl: false,
  layers: [layers.streets]
});
currentBaseLayer = layers.streets;

// Try geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      map.setView(coords, 13);
      marker = L.marker(coords).addTo(map);
    },
    () => console.warn("Geolocation blocked or failed."),
    { timeout: 10000 }
  );
} else {
  console.warn("Geolocation not supported.");
}

// Click to place marker
map.on("click", (e) => {
  if (marker) map.removeLayer(marker);
  marker = L.marker(e.latlng).addTo(map);
});

// Layer switching
document.getElementById("layer-select").addEventListener("change", (e) => {
  map.removeLayer(currentBaseLayer);
  const selected = e.target.value;
  currentBaseLayer = layers[selected];
  map.addLayer(currentBaseLayer);
});

// Autocomplete via Photon API
const searchBox = document.getElementById("search-box");
const autocompleteList = document.getElementById("autocomplete-list");

searchBox.addEventListener("input", async () => {
  const query = searchBox.value.trim();
  autocompleteList.innerHTML = "";

  if (query.length < 3) return;

  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
  const data = await res.json();

  data.features.forEach(place => {
    const li = document.createElement("li");
    li.textContent = place.properties.name + (place.properties.city ? `, ${place.properties.city}` : '');
    li.addEventListener("click", () => {
      const [lon, lat] = place.geometry.coordinates;
      map.setView([lat, lon], 13);
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lon]).addTo(map);
      searchBox.value = li.textContent;
      autocompleteList.innerHTML = "";
    });
    autocompleteList.appendChild(li);
  });
});

// Dismiss autocomplete when clicking outside
document.addEventListener("click", (e) => {
  if (!searchBox.contains(e.target)) {
    autocompleteList.innerHTML = "";
  }
});
