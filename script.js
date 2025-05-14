// ─── INITIALIZE ───────────────────────────────────────────────────────────────
const map = L.map('map',{ center:[40,-100],zoom:4,zoomControl:false });
const base = {
  street:    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ attribution:'© OSM' }),
  terrain:   L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{ attribution:'© OpenTopo' }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/' +
              'World_Imagery/MapServer/tile/{z}/{y}/{x}',{ attribution:'© Esri' })
};
base.street.addTo(map);

// ─── STATE ────────────────────────────────────────────────────────────────────
let drawing = false, draftM = [], draftOut, draftIn;
const routes = [];

// ─── UI HOOKS ─────────────────────────────────────────────────────────────────
const drawerBtn = document.getElementById('toggleDrawer');
const formEl    = document.getElementById('routeForm');
drawerBtn.onclick = () => {
  drawing = !drawing;
  drawerBtn.textContent = drawing ? 'Stop Drawing' : '+';
  formEl.style.display = drawing ? 'flex' : 'none';
};

// ─── SEARCH + VIEW TOGGLE ─────────────────────────────────────────────────────
L.Control.geocoder().addTo(map);
const views = ['street','terrain','satellite'];
let vi = 0;
const vbtn = document.createElement('button');
vbtn.innerText='Toggle View';
Object.assign(vbtn.style,{position:'absolute',top:'10px',left:'10px',zIndex:1000});
vbtn.onclick = ()=>{
  console.log('Switching view from',views[vi]);
  base[views[vi]].remove();
  vi=(vi+1)%views.length;
  console.log('To',views[vi]);
  base[views[vi]].addTo(map);
};
document.body.appendChild(vbtn);

// ─── DRAWING ───────────────────────────────────────────────────────────────────
map.on('click',e=>{
  if(!drawing)return;
  const m=L.marker(e.latlng).addTo(map);
  draftM.push(m);
  if(draftOut) map.removeLayer(draftOut);
  if(draftIn)  map.removeLayer(draftIn);
  const pts=draftM.map(m=>m.getLatLng());
  draftOut=L.polyline(pts,{color:'#66ccff',weight:6,opacity:0.8}).addTo(map);
  draftIn=L.polyline(pts,{color:'#005f99',weight:2,opacity:1}).addTo(map);
});

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
formEl.onsubmit = e => {
  e.preventDefault();
  if(draftM.length<2) return alert('Add 2+ points');

  const title = document.getElementById('title').value;
  const desc  = document.getElementById('description').value;
  const file  = document.getElementById('photo').files[0];
  const photo = file? URL.createObjectURL(file):null;
  const pts   = draftM.map(m=>m.getLatLng());

  // permanent
  const outline = L.polyline(pts,{color:'#66ccff',weight:6,opacity:0.8}).addTo(map);
  const inner   = L.polyline(pts,{color:'#005f99',weight:2,opacity:1}).addTo(map);
  const markers = draftM.slice();

  const route={title,desc,photo,outline,inner,markers};
  routes.push(route);

  outline.on('click',()=>showInfo(route));

  console.log('--- HIDE ROUTE ---',route);
  hideRoute(route);

  // click first to restore
  markers[0].off('click').on('click',()=>{
    console.log('--- SHOW ROUTE ---',route);
    showRoute(route);
  });

  // clear draft
  draftM.forEach(m=>map.removeLayer(m));
  draftM=[]; if(draftOut)map.removeLayer(draftOut); if(draftIn)map.removeLayer(draftIn);
  drawing=false; drawerBtn.textContent='+'; formEl.reset(); formEl.style.display='none';
};

// ─── helpers ───────────────────────────────────────────────────────────────────
function hideRoute(r) {
  r.markers.slice(1).forEach(m=>{ 
    console.log('removing marker',m);
    map.removeLayer(m);
  });
  console.log('removing outline & inner');
  map.removeLayer(r.outline);
  map.removeLayer(r.inner);
}

function showRoute(r) {
  r.markers.forEach(m=>{
    if(!map.hasLayer(m)) {
      console.log('re-adding marker',m);
      m.addTo(map);
    }
  });
  if(!map.hasLayer(r.outline)) {
    console.log('re-adding outline');
    r.outline.addTo(map);
  }
  if(!map.hasLayer(r.inner)) {
    console.log('re-adding inner');
    r.inner.addTo(map);
  }
}

// ─── CLEAR DRAFT ─────────────────────────────────────────────────────────────
document.getElementById('clearRoute').onclick = ()=>{
  draftM.forEach(m=>map.removeLayer(m)); draftM=[];
  if(draftOut) map.removeLayer(draftOut);
  if(draftIn)  map.removeLayer(draftIn);
};

// ─── INFO PANEL ───────────────────────────────────────────────────────────────
function showInfo(r) {
  const box=document.getElementById('routeInfo');
  box.innerHTML=`<h3>${r.title}</h3><p>${r.desc}</p>`;
  if(r.photo){
    const img=document.createElement('img'); img.src=r.photo; box.appendChild(img);
  }
  box.style.display='block';
}

// ─── GEOLOCATION ──────────────────────────────────────────────────────────────
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(p=>{
    map.setView([p.coords.latitude,p.coords.longitude],13);
  },()=>console.warn('no geo'));
}
