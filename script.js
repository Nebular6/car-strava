// ─── INITIALIZE MAP & BASE LAYERS ─────────────────────────────────────────────
const map = L.map('map', { center: [40, -100], zoom: 4, zoomControl: false });

// Street / Terrain / Satellite tile layers
const baseLayers = {
  street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map),

  terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenTopoMap contributors'
  }),

  satellite: L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Imagery © Esri & NASA' }
  )
};

// ─── GLOBAL STATE ───────────────────────────────────────────────────────────────
let drawing = false;         // are we in drawing mode?
let draftPts = [];           // array of LatLngs while drawing
let draftOut, draftIn;       // preview polylines
const routes = [];           // saved routes

// ─── DRAWER & FORM TOGGLE ───────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? 'Stop Drawing' : '+';
  formEl.style.display   = drawing ? 'flex' : 'none';
});

// ─── GEOCODER SEARCH CONTROL ────────────────────────────────────────────────────
L.Control.geocoder().addTo(map);

// ─── STREET/TERRAIN/SATELLITE VIEW TOGGLE ───────────────────────────────────────
const viewOrder = ['street','terrain','satellite'];
let viewIdx = 0;
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, {
  position: 'absolute', top: '10px', left: '10px', zIndex: 1000
});
viewBtn.addEventListener('click', () => {
  // remove current layer
  baseLayers[viewOrder[viewIdx]].remove();
  // advance index
  viewIdx = (viewIdx + 1) % viewOrder.length;
  // add next layer
  baseLayers[viewOrder[viewIdx]].addTo(map);
});
document.body.appendChild(viewBtn);

// ─── ROUTE DRAWING PREVIEW ──────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;

  // record point
  draftPts.push(e.latlng);

  // clear previous preview
  if (draftOut) map.removeLayer(draftOut);
  if (draftIn)  map.removeLayer(draftIn);

  // draw two‑tone preview lines
  draftOut = L.polyline(draftPts, {
    color: '#66ccff', weight: 6, opacity: 0.8
  }).addTo(map);

  draftIn = L.polyline(draftPts, {
    color: '#005f99', weight: 2, opacity: 1
  }).addTo(map);
});

// ─── SUBMIT ROUTE ───────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (draftPts.length < 2) {
    return alert('Please add at least two points before submitting.');
  }

  // grab form values
  const title     = document.getElementById('title').value;
  const desc      = document.getElementById('description').value;
  const file      = document.getElementById('photo').files[0];
  const photoURL  = file ? URL.createObjectURL(file) : null;

  // build route object
  const route = {
    title,
    desc,
    photoURL,
    latlngs: draftPts.slice(),
    outline: null,
    inner: null,
    pin: null
  };

  // prepare but do not add polylines
  route.outline = L.polyline(route.latlngs, {
    color: '#66ccff', weight: 6, opacity: 0.8
  });
  route.inner   = L.polyline(route.latlngs, {
    color: '#005f99', weight: 2, opacity: 1
  });

  // place single “route‐pin” at first point
  const first = route.latlngs[0];
  route.pin = L.circleMarker(first, {
    radius: 8,
    fillColor: '#66ccff',
    color: '#005f99',
    weight: 2,
    fillOpacity: 1
  }).addTo(map);

  // click the pin to reveal lines + info panel
  route.pin.on('click', () => {
    route.outline.addTo(map);
    route.inner.addTo(map);
    showRouteInfo(route);
  });

  routes.push(route);

  // clean up drafts
  draftPts = [];
  if (draftOut) map.removeLayer(draftOut);
  if (draftIn)  map.removeLayer(draftIn);

  // reset UI
  drawing = false;
  drawerBtn.textContent = '+';
  formEl.reset();
  formEl.style.display = 'none';
});

// ─── CLEAR DRAFT ───────────────────────────────────────────────────────────────
document.getElementById('clearRoute').addEventListener('click', () => {
  // remove draft preview
  draftPts = [];
  if (draftOut) map.removeLayer(draftOut);
  if (draftIn)  map.removeLayer(draftIn);
});

// ─── INFO PANEL DISPLAY ────────────────────────────────────────────────────────
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

// ─── GEOLOCATION ON LOAD ───────────────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
    () => console.warn('Geolocation not allowed.')
  );
}
