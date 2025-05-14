let map = L.map('map', {
  center: [40, -100],
  zoom: 4,
  zoomControl: false
});

const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const satelliteLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  tileSize: 256,
  maxZoom: 19
});

let routeMarkers = [];
let currentPolyline = null;
let routes = [];
let routeDrawingActive = false;

// Drawer toggle logic
const drawerBtn = document.getElementById('toggleDrawer');
const routeForm = document.getElementById('routeForm');
drawerBtn.addEventListener('click', () => {
  drawerBtn.classList.toggle('open');
  routeForm.style.display = routeForm.style.display === 'none' ? 'flex' : 'none';
});

// Search Bar - Geocoding
L.Control.geocoder().addTo(map);

// Satellite/Street Toggle
const viewToggleBtn = document.createElement('button');
viewToggleBtn.innerText = 'Toggle Satellite';
viewToggleBtn.style.position = 'absolute';
viewToggleBtn.style.top = '10px';
viewToggleBtn.style.left = '10px';
viewToggleBtn.style.zIndex = 1000;
viewToggleBtn.addEventListener('click', () => {
  if (map.hasLayer(satelliteLayer)) {
    map.removeLayer(satelliteLayer);
    map.addLayer(tileLayer);
  } else {
    map.removeLayer(tileLayer);
    map.addLayer(satelliteLayer);
  }
});
document.body.appendChild(viewToggleBtn);

// Map click to create route (if in drawing mode)
map.on('click', (e) => {
  if (!routeDrawingActive) return;

  const marker = L.marker(e.latlng).addTo(map);
  routeMarkers.push(marker);

  if (currentPolyline) {
    map.removeLayer(currentPolyline);
  }

  const latlngs = routeMarkers.map(m => m.getLatLng());
  currentPolyline = L.polyline(latlngs, {
    color: '#66ccff',
    weight: 6,
    opacity: 0.8,
    className: 'route-outline'
  }).addTo(map);

  L.polyline(latlngs, {
    color: '#005f99',
    weight: 2,
    opacity: 1
  }).addTo(map);
});

// Submit route
document.getElementById('routeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const photoInput = document.getElementById('photo');
  const photo = photoInput.files[0];

  if (routeMarkers.length < 2) {
    alert('Please add at least two points.');
    return;
  }

  const latlngs = routeMarkers.map(m => m.getLatLng());
  const routeLine = L.polyline(latlngs, {
    color: '#66ccff',
    weight: 6,
    opacity: 0.8
  }).addTo(map);

  L.polyline(latlngs, {
    color: '#005f99',
    weight: 2,
    opacity: 1
  }).addTo(map);

  const route = {
    title,
    description,
    photoURL: photo ? URL.createObjectURL(photo) : null,
    polyline: routeLine,
    latlngs
  };
  routes.push(route);

  routeLine.on('click', () => showRouteInfo(route));

  // Reset route markers and drawing mode
  routeMarkers.forEach(m => map.removeLayer(m));
  routeMarkers = [];
  if (currentPolyline) map.removeLayer(currentPolyline);
  currentPolyline = null;
  routeDrawingActive = false;  // Disable route drawing
  routeForm.reset();
  drawerBtn.click();
});

// Clear button
document.getElementById('clearRoute').addEventListener('click', () => {
  routeMarkers.forEach(m => map.removeLayer(m));
  routeMarkers = [];
  if (currentPolyline) map.removeLayer(currentPolyline);
  currentPolyline = null;
});

// Start drawing mode
document.getElementById('toggleDrawer').addEventListener('click', () => {
  routeDrawingActive = !routeDrawingActive;
  if (routeDrawingActive) {
    drawerBtn.textContent = 'Stop Drawing';
  } else {
    drawerBtn.textContent = '+';
  }
});

function showRouteInfo(route) {
  const infoBox = document.getElementById('routeInfo');
  infoBox.innerHTML = `<h3>${route.title}</h3><p>${route.description}</p>`;
  if (route.photoURL) {
    const img = document.createElement('img');
    img.src = route.photoURL;
    infoBox.appendChild(img);
  }
  infoBox.style.display = 'block';
}

// Ask for geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    },
    () => console.warn('Geolocation not allowed.')
  );
}
