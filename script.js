// ─── INITIAL SETUP ────────────────────────────────────────────────────────────

// Initialize map
const map = L.map('map', {
  center: [40, -100],
  zoom: 4,
  zoomControl: false
});

// Base tile layers
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

// Geocoder (search box)
L.Control.geocoder().addTo(map);

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
let drawing = false;      // drawing mode on/off
let draftPts = [];        // array of LatLng during drawing
let draftOut, draftIn;    // preview polylines
let activeRoute = null;   // route currently shown in info panel
const routes = [];        // saved routes

// ─── UI ELEMENTS ──────────────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
const infoBox   = document.getElementById('routeInfo');

// ─── DRAWER & DRAWING TOGGLE ─────────────────────────────────────────────────
drawerBtn.addEventListener('click', () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? '✕' : '+';
  formEl.style.display   = drawing ? 'flex' : 'none';
});

// ─── VIEW TOGGLE ──────────────────────────────────────────────────────────────
const viewOrder = ['street','terrain','satellite'];
let viewIdx = 0;
const viewBtn = document.createElement('button');
viewBtn.innerText = 'Toggle View';
Object.assign(viewBtn.style, {
  position: 'absolute', top: '10px', left: '10px', zIndex: 1000
});
viewBtn.addEventListener('click', () => {
  baseLayers[viewOrder[viewIdx]].remove();
  viewIdx = (viewIdx + 1) % viewOrder.length;
  baseLayers[viewOrder[viewIdx]].addTo(map);
});
document.body.appendChild(viewBtn);

// ─── ROUTE DRAWING PREVIEW ────────────────────────────────────────────────────
map.on('click', e => {
  if (!drawing) return;

  draftPts.push(e.latlng);

  // remove previous preview
  draftOut && map.removeLayer(draftOut);
  draftIn  && map.removeLayer(draftIn);

  // draw new preview
  draftOut = L.polyline(draftPts, {
    color: '#66ccff',
    weight: 6,
    opacity: 0.8
  }).addTo(map);

  draftIn = L.polyline(draftPts, {
    color: '#005f99',
    weight: 2,
    opacity: 1
  }).addTo(map);
});

// ─── SUBMIT ROUTE ─────────────────────────────────────────────────────────────
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (draftPts.length < 2) {
    return alert('Please add at least two points.');
  }

  // grab inputs
  const title    = document.getElementById('title').value;
  const desc     = document.getElementById('description').value;
  const file     = document.getElementById('photo').files[0];
  const photoURL = file ? URL.createObjectURL(file) : null;

  // build route object
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

  // prepare polylines (not yet added)
  route.outline = L.polyline(route.pts, {
    color: '#66ccff',
    weight: 6,
    opacity: 0.8
  });
  route.inner = L.polyline(route.pts, {
    color: '#005f99',
    weight: 2,
    opacity: 1
  });

  // place single start-pin
  const start = route.pts[0];
  route.pin = L.circleMarker(start, {
    radius: 8,
    fillColor: '#66ccff',
    color: '#005f99',
    weight: 2,
    fillOpacity: 1
  }).addTo(map);

  // pin click reveals route, end-pin, and info
  route.pin.on('click', () => {
    // add polylines
    route.outline.addTo(map);
    route.inner.addTo(map);

    // add or show end-pin
    if (route.endPin) {
      route.endPin.addTo(map);
    } else {
      const last = route.pts[route.pts.length - 1];
      route.endPin = L.circleMarker(last, {
        radius: 6,
        fillColor: '#005f99',
        color: '#66ccff',
        weight: 2,
        fillOpacity: 1
      }).addTo(map);
    }

    // display info panel
    showRouteInfo(route);
  });

  routes.push(route);

  // clear draft preview
  draftPts = [];
  draftOut && map.removeLayer(draftOut);
  draftIn  && map.removeLayer(draftIn);

  // reset UI
  drawing = false;
  drawerBtn.textContent = '+';
  formEl.reset();
  formEl.style.display = 'none';
});

// ─── CLEAR DRAFT ───────────────────────────────────────────────────────────────
document.getElementById('clearRoute').addEventListener('click', () => {
  draftPts = [];
  draftOut && map.removeLayer(draftOut);
  draftIn  && map.removeLayer(draftIn);
});

// ─── INFO PANEL & CLOSE HANDLER ────────────────────────────────────────────────
function showRouteInfo(route) {
  activeRoute = route;
  infoBox.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h3 style="margin:0">${route.title}</h3>
      <button id="closeInfo" style="font-size:18px;line-height:1;
              border:none;background:transparent;cursor:pointer">✕</button>
    </div>
    <p>${route.desc}</p>
  `;
  if (route.photoURL) {
    const img = document.createElement('img');
    img.src = route.photoURL;
    img.style.width = '100%';
    img.style.borderRadius = '6px';
    img.style.marginTop = '8px';
    infoBox.appendChild(img);
  }
  infoBox.style.display = 'block';

  // close button behavior
  document.getElementById('closeInfo').onclick = () => {
    infoBox.style.display = 'none';
    // remove polylines and end-pin, keep only the start-pin
    map.removeLayer(activeRoute.outline);
    map.removeLayer(activeRoute.inner);
    if (activeRoute.endPin) {
      map.removeLayer(activeRoute.endPin);
    }
    activeRoute = null;
  };
}

// ─── GEOLOCATION ON LOAD ───────────────────────────────────────────────────────
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
    () => console.warn('Geolocation not allowed.')
  );
}
