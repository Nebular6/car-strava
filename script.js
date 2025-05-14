// ─── INITIALIZE MAP & LAYERS ─────────────────────────────────────────────────
const map = L.map('map', { center: [40, -100], zoom: 4, zoomControl: false });
const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);
const terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap contributors'
});
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Imagery © Esri & NASA'
});

// ─── STATE ────────────────────────────────────────────────────────────────────
let drawing = false;
let draftMarkers = [];
let draftOutline, draftInner;
const routes = [];

// ─── FORM TOGGLE ──────────────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? 'Stop Drawing' : '+';
  formEl.style.display = drawing ? 'flex' : 'none';
});

// ─── GEOCODER & VIEW TOGGLE ──────────────────────────────────────────────────
L.Control.geocoder().addTo(map);
const views = [street, terrain, satellite];
let viewIdx = 0;
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, { position: 'absolute', top: '10px', left: '10px', zIndex:1000 });
viewBtn.addEventListener('click', () => {
  map.removeLayer(views[viewIdx]);
  viewIdx = (viewIdx + 1) % views.length;
  map.addLayer(views[viewIdx]);
});
document.body.appendChild(viewBtn);

// ─── DRAWING LOGIC ────────────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;
  const m = L.marker(e.latlng).addTo(map);
  draftMarkers.push(m);

  if (draftOutline) map.removeLayer(draftOutline);
  if (draftInner)   map.removeLayer(draftInner);

  const pts = draftMarkers.map(x=>x.getLatLng());
  draftOutline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  draftInner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);
});

// ─── SUBMIT ROUTE ─────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (draftMarkers.length < 2) {
    return alert('Add at least two points.');
  }

  // capture form data
  const title     = document.getElementById('title').value;
  const desc      = document.getElementById('description').value;
  const file      = document.getElementById('photo').files[0];
  const photoURL  = file ? URL.createObjectURL(file) : null;
  const pts       = draftMarkers.map(m=>m.getLatLng());

  // create permanent polylines
  const outline = L.polyline(pts, { color:'#66ccff', weight:6, opacity:0.8 }).addTo(map);
  const inner   = L.polyline(pts, { color:'#005f99', weight:2, opacity:1   }).addTo(map);

  // explicitly grab the first marker
  const firstMarker = draftMarkers[0];
  // copy all markers
  const allMarkers = draftMarkers.slice();

  const route = { title, desc, photoURL, outline, inner, allMarkers, firstMarker };
  routes.push(route);

  // info popup on line click
  outline.on('click', () => showInfo(route));

  // hide everything except the first marker
  allMarkers.forEach(m => {
    if (m !== firstMarker) map.removeLayer(m);
  });
  map.removeLayer(outline);
  map.removeLayer(inner);

  // make first marker clickable to restore full route
  firstMarker.off('click').on('click', () => {
    allMarkers.forEach(m => m.addTo(map));
    outline.addTo(map);
    inner.addTo(map);
  });

  // clear draft
  draftMarkers.forEach(m => map.removeLayer(m));
  draftMarkers = [];
  if (draftOutline) map.removeLayer(draftOutline);
  if (draftInner)   map.removeLayer(draftInner);

  // reset UI
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

// ─── INFO PANEL ───────────────────────────────────────────────────────────────
function showInfo(route) {
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
  }, () => console.warn('Geolocation not allowed.'));
}
