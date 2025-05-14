let map, marker;
let tiles = {
  streets: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }),
  satellite: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains:['mt0','mt1','mt2','mt3'],
    attribution: 'Satellite © Google'
  }),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data © OpenTopoMap contributors'
  })
};

map = L.map('map', {
  center: [0, 0],
  zoom: 2,
  zoomControl: false,
  layers: [tiles.streets]
});

// Geolocation on load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      map.setView(coords, 13);
      marker = L.marker(coords).addTo(map);
    },
    () => {
      console.warn('Geolocation permission denied or unavailable.');
    }
  );
}

// Map click to place marker
map.on('click', function(e) {
  if (marker) map.removeLayer(marker);
  marker = L.marker(e.latlng).addTo(map);
});

// Layer switcher
document.getElementById('layer-select').addEventListener('change', function() {
  const selected = this.value;
  map.eachLayer(layer => map.removeLayer(layer));
  tiles[selected].addTo(map);
});

// Autocomplete
const searchBox = document.getElementById("search-box");
const resultList = document.getElementById("autocomplete-list");

searchBox.addEventListener("input", async () => {
  const query = searchBox.value;
  resultList.innerHTML = "";

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
      resultList.innerHTML = "";
    });
    resultList.appendChild(li);
  });
});
