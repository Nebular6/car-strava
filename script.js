let map = L.map('map', {
  center: [40, -100],
  zoom: 4,
  zoomControl: false
});

// ─── Base Layers ───────────────────────────────────────────────────────────────
const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const satelliteLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
});

const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap contributors'
});

// ─── State ────────────────────────────────────────────────────────────────────
let drawing = false;
let tempMarkers = [];
let tempOutline, tempInner;
const routes = [];

// ─── Drawer / Form Toggle ────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? 'Stop Drawing' : '+';
  formEl.style.display = drawing ? 'flex' : 'none';
});

// ─── Geocoder Search ──────────────────────────────────────────────────────────
L.Control.geocoder().addTo(map);

// ─── View Toggle ─────────────────────────────────────────────────────────────
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, {
  position: 'absolute', top: '10px', left: '10px', zIndex:1000
});
viewBtn.addEventListener('click', () => {
  if (map.hasLayer(streetLayer)) {
    map.removeLayer(streetLayer);
    map.addLayer(terrainLayer);
  } else if (map.hasLayer(terrainLayer)) {
    map.removeLayer(terrainLayer);
    map.addLayer(satelliteLayer);
  } else {
    map.removeLayer(satelliteLayer);
    map.addLayer(streetLayer);
  }
});
document.body.appendChild(viewBtn);

// ─── DRAWING LOGIC ────────────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;

  // add marker
  const m = L.marker(e.latlng).addTo(map);
  tempMarkers.push(m);

  // redraw preview
  if (tempOutline) map.removeLayer(tempOutline);
  if (tempInner)   map.removeLayer(tempInner);

  const pts = tempMarkers.map(m=>m.getLatLng());
  tempOutline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  tempInner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);
});

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (tempMarkers.length < 2) return alert('Add at least two points');

  // build route object
  const title       = document.getElementById('title').value;
  const desc        = document.getElementById('description').value;
  const photoFile   = document.getElementById('photo').files[0];
  const photoURL    = photoFile ? URL.createObjectURL(photoFile) : null;
  const pts         = tempMarkers.map(m=>m.getLatLng());

  // permanent polylines
  const outline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  const inner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);

  // copy markers array
  const markers = tempMarkers.slice();

  // route record
  const route = { title, desc, photoURL, outline, inner, markers };
  routes.push(route);

  // hide everything except first marker
  _hideRoute(route);

  // attach click to first marker to restore
  markers[0].on('click', () => _showRoute(route));

  // reset temp drawing state
  tempMarkers.forEach(m=>map.removeLayer(m));
  tempMarkers.length = 0;
  if (tempOutline) map.removeLayer(tempOutline);
  if (tempInner)   map.removeLayer(tempInner);

  drawing = false;
  drawerBtn.textContent = '+';
  formEl.reset();
  formEl.style.display = 'none';
});

// ─── CLEAR DRAFT ─────────────────────────────────────────────────────────────
document.getElementById('clearRoute').addEventListener('click', () => {
  tempMarkers.forEach(m => map.removeLayer(m));
  tempMarkers = [];
  if (tempOutline) map.removeLayer(tempOutline);
  if (tempInner)   map.removeLayer(tempInner);
});

// ─── SHOW / HIDE HELPERS ─────────────────────────────────────────────────────
function _hideRoute(route) {
  // remove all but first marker
  route.markers.slice(1).forEach(m => map.removeLayer(m));
  // remove polylines
  map.removeLayer(route.outline);
  map.removeLayer(route.inner);
}
function _showRoute(route) {
  // re-add markers & polylines
  route.markers.forEach(m => m.addTo(map));
  route.outline.addTo(map);
  route.inner.addTo(map);
}

// ─── ROUTE INFO PANEL ────────────────────────────────────────────────────────
function showRouteInfo(route) {
  const box = document.getElementById('routeInfo');
  box.innerHTML = `<h3>${route.title}</h3><p>${route.desc}</p>`;
  if (route.photoURL) {
    const img = document.createElement('img');
    img.src = route.photoURL;
    box.appendChild(img);
  }
  box.style.display = 'block';
}

// make polylines clickable for info
routes.forEach(r => {
  r.outline.on('click', () => showRouteInfo(r));
});

// ─── GEOLOCATION ──────────────────────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 13);
  }, ()=>console.warn('No geolocation'));
}
