// ─── INITIALIZE MAP & BASE LAYERS ─────────────────────────────────────────────
const map = L.map('map', { center: [40, -100], zoom: 4, zoomControl: false });
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
let drawing = false;
let draftPts = [];
let draftOut, draftIn;
const routes = [];

// ─── DRAWER & FORM TOGGLE ───────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? '✕' : '+';
  formEl.style.display   = drawing ? 'flex' : 'none';
});

// ─── GEOCODER SEARCH CONTROL ────────────────────────────────────────────────────
L.Control.geocoder().addTo(map);

// ─── STREET/TERRAIN/SATELLITE VIEW TOGGLE ───────────────────────────────────────
const viewOrder = ['street','terrain','satellite'];
let viewIdx = 0;
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, { position: 'absolute', top: '10px', left: '10px', zIndex:1000 });
viewBtn.addEventListener('click', () => {
  baseLayers[viewOrder[viewIdx]].remove();
  viewIdx = (viewIdx + 1) % viewOrder.length;
  baseLayers[viewOrder[viewIdx]].addTo(map);
});
document.body.appendChild(viewBtn);

// ─── ROUTE DRAWING PREVIEW ──────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;
  draftPts.push(e.latlng);

  if (draftOut) map.removeLayer(draftOut);
  if (draftIn)  map.removeLayer(draftIn);

  draftOut = L.polyline(draftPts, { color: '#66ccff', weight: 6, opacity: 0.8 }).addTo(map);
  draftIn  = L.polyline(draftPts, { color: '#005f99', weight: 2, opacity: 1   }).addTo(map);
});

// ─── SUBMIT ROUTE ───────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (draftPts.length < 2) {
    return alert('Please add at least two points.');
  }

  // capture inputs
  const title    = document.getElementById('title').value;
  const desc     = document.getElementById('description').value;
  const file     = document.getElementById('photo').files[0];
  const photoURL = file ? URL.createObjectURL(file) : null;

  const route = {
    title,
    desc,
    photoURL,
    pts: draftPts.slice(),
    outline: null,
    inner: null,
    pin: null,
    endPin: null
  };

  // prepare polylines (but don't add yet)
  route.outline = L.polyline(route.pts, { color:'#66ccff', weight:6, opacity:0.8 });
  route.inner   = L.polyline(route.pts, { color:'#005f99', weight:2, opacity:1   });

  // place the single “route‑pin” at the start
  route.pin = L.circleMarker(route.pts[0], {
    radius: 8, fillColor: '#66ccff', color: '#005f99', weight: 2, fillOpacity: 1
  }).addTo(map);

  // clicking that pin reveals the route + info + end‑pin
  route.pin.on('click', () => {
    // show lines
    route.outline.addTo(map);
    route.inner.addTo(map);

    // show end marker
    if (route.endPin) {
      route.endPin.addTo(map);
    } else {
      route.endPin = L.circleMarker(route.pts[route.pts.length - 1], {
        radius: 6, fillColor: '#005f99', color: '#66ccff', weight: 2, fillOpacity: 1
      }).addTo(map);
    }

    // show info panel with close button
    showRouteInfo(route);
  });

  routes.push(route);

  // clear drawing preview
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
  draftPts = [];
  if (draftOut) map.removeLayer(draftOut);
  if (draftIn)  map.removeLayer(draftIn);
});

// ─── INFO PANEL DISPLAY ────────────────────────────────────────────────────────
function showRouteInfo(route) {
  const box = document.getElementById('routeInfo');
  // build header with close‑button
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">${route.title}</h3>
      <button id="closeInfo" style="font-size:18px;line-height:1;border:none;
              background:transparent;cursor:pointer">✕</button>
    </div>
    <p>${route.desc}</p>
  `;
  // optional photo
  if (route.photoURL) {
    const img = document.createElement('img');
    img.src = route.photoURL;
    img.style.width = '100%';
    img.style.borderRadius = '6px';
    img.style.marginTop = '8px';
    box.appendChild(img);
  }
  box.style.display = 'block';

  // wire up close button
  document.getElementById('closeInfo').onclick = () => {
    box.style.display = 'none';
  };
}

// ─── GEOLOCATION ON LOAD ───────────────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
    () => console.warn('Geolocation not allowed.')
  );
}
