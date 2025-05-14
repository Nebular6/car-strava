// ─── INITIALIZE MAP & LAYERS ─────────────────────────────────────────────────
const map = L.map('map', {
  center: [40, -100],
  zoom: 4,
  zoomControl: false
});

// define our three base layers
const baseLayers = {
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }),
  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenTopoMap contributors'
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/' +
    'World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery © Esri & NASA'
  })
};
// start with street
baseLayers.street.addTo(map);

// ─── STATE ────────────────────────────────────────────────────────────────────
let drawing = false;
let draftMarkers = [];
let draftOutline = null, draftInner = null;
const routes = [];

// ─── DRAWER & FORM TOGGLE ─────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');

drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? 'Stop Drawing' : '+';
  formEl.style.display   = drawing ? 'flex' : 'none';
});

// ─── GEOCODER SEARCH ──────────────────────────────────────────────────────────
L.Control.geocoder().addTo(map);

// ─── VIEW TOGGLE ──────────────────────────────────────────────────────────────
const viewOrder = ['street','terrain','satellite'];
let viewIdx = 0;
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, {
  position: 'absolute', top: '10px', left: '10px', zIndex:1000
});
viewBtn.addEventListener('click', () => {
  // remove current
  baseLayers[viewOrder[viewIdx]].remove();
  // next index
  viewIdx = (viewIdx + 1) % viewOrder.length;
  // add next
  baseLayers[viewOrder[viewIdx]].addTo(map);
});
document.body.appendChild(viewBtn);

// ─── ROUTE-DRAWING (DRAFT) ────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;
  // add a draft marker
  const m = L.marker(e.latlng).addTo(map);
  draftMarkers.push(m);

  // remove existing draft lines
  if (draftOutline) map.removeLayer(draftOutline);
  if (draftInner)   map.removeLayer(draftInner);

  // draw two‑tone preview
  const pts = draftMarkers.map(m=>m.getLatLng());
  draftOutline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  draftInner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);
});

// ─── SUBMIT ROUTE ─────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (draftMarkers.length < 2) {
    return alert('Please add at least two points before submitting.');
  }

  // capture form data
  const title     = document.getElementById('title').value;
  const desc      = document.getElementById('description').value;
  const file      = document.getElementById('photo').files[0];
  const photoURL  = file ? URL.createObjectURL(file) : null;
  const pts       = draftMarkers.map(m=>m.getLatLng());

  // create permanent lines
  const outline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  const inner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);

  // copy markers array and keep references
  const markers = draftMarkers.slice();

  // build route record
  const route = { title, desc, photoURL, outline, inner, markers };
  routes.push(route);

  // attach info on line click
  outline.on('click', () => showRouteInfo(route));

  // hide all but first marker & lines
  hideRoute(route);

  // restore on first marker click
  markers[0].on('click', () => showRoute(route));

  // clear draft state
  draftMarkers.forEach(m => map.removeLayer(m));
  draftMarkers = [];
  if (draftOutline) map.removeLayer(draftOutline);
  if (draftInner)   map.removeLayer(draftInner);

  drawing = false;
  drawerBtn.textContent = '+';
  formEl.reset();
  formEl.style.display = 'none';
});

// ─── CLEAR DRAFT ─────────────────────────────────────────────────────────────
document.getElementById('clearRoute').addEventListener('click', () => {
  draftMarkers.forEach(m => map.removeLayer(m));
  draftMarkers = [];
  if (draftOutline) map.removeLayer(draftOutline);
  if (draftInner)   map.removeLayer(draftInner);
});

// ─── HIDE / SHOW ROUTE HELPERS ────────────────────────────────────────────────
function hideRoute(route) {
  // remove all markers except the first
  route.markers.slice(1).forEach(m => map.removeLayer(m));
  // remove both lines
  map.removeLayer(route.outline);
  map.removeLayer(route.inner);
}

function showRoute(route) {
  // re‑add markers & lines
  route.markers.forEach(m => m.addTo(map));
  route.outline.addTo(map);
  route.inner.addTo(map);
}

// ─── ROUTE INFO PANEL ─────────────────────────────────────────────────────────
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

// ─── GEOLOCATION ──────────────────────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 13);
  }, ()=>console.warn('Geolocation denied'));
}
