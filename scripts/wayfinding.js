let watchId = null;
let arrowEntity, infoDiv;
const GUIDE_AHEAD_METERS = 8;

window.onload = async () => {
  const pois = await fetch("data/pois.json").then(r => r.json());
  const destinoId = localStorage.getItem("destino");
  const currentDestination = pois.find(p => p.id == destinoId);

  if (!currentDestination) {
    alert("No se encontró el destino seleccionado");
    return;
  }

  arrowEntity = document.getElementById("arrow");
  infoDiv = document.getElementById("info");

  if (!('geolocation' in navigator)) {
    alert("Geolocalización no soportada.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => updateUserPosition(pos, currentDestination),
    err => alert("No se pudo obtener ubicación: " + err.message),
    { enableHighAccuracy: true, timeout: 7000 }
  );
};

function toRad(d) { return (d * Math.PI) / 180; }
function toDeg(r) { return (r * 180) / Math.PI; }

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function destPoint(lat, lon, brng, dist) {
  const R = 6371e3;
  const ang = dist / R;
  const lat2 = Math.asin(Math.sin(toRad(lat)) * Math.cos(ang) +
                         Math.cos(toRad(lat)) * Math.sin(ang) * Math.cos(toRad(brng)));
  const lon2 = toRad(lon) + Math.atan2(
    Math.sin(toRad(brng)) * Math.sin(ang) * Math.cos(toRad(lat)),
    Math.cos(ang) - Math.sin(toRad(lat)) * Math.sin(lat2)
  );
  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

function updateUserPosition(pos, dest) {
  const userLat = pos.coords.latitude;
  const userLon = pos.coords.longitude;
  const dist = haversine(userLat, userLon, dest.Latitud, dest.Longitud);
  const bear = bearing(userLat, userLon, dest.Latitud, dest.Longitud);

  infoDiv.innerHTML = `Destino: <b>${dest.Nombre}</b><br>Distancia: ${Math.round(dist)} m<br>Rumbo: ${Math.round(bear)}°`;

  if (dist < 3) {
    infoDiv.innerHTML = `Has llegado a <b>${dest.Nombre}</b>`;
    arrowEntity.setAttribute('visible','false');
    if (watchId) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    return;
  }

  const targetPoint = destPoint(userLat, userLon, bear, GUIDE_AHEAD_METERS);
  arrowEntity.setAttribute('gps-entity-place', `latitude: ${targetPoint.lat}; longitude: ${targetPoint.lon};`);
  const arrowYaw = (bear + 180) % 360;
  arrowEntity.setAttribute('rotation', `0 ${arrowYaw} 0`);
  const scale = Math.min(3, Math.max(0.8, dist / 30));
  arrowEntity.setAttribute('scale', `${scale} ${scale} ${scale}`);
}

// cleanup
window.addEventListener('beforeunload', () => {
  if (watchId) navigator.geolocation.clearWatch(watchId);
});
