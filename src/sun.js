import {getPosition, getTimes} from './vendor/suncalc.js';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Point subsolaire : le seul endroit du globe où le Soleil est au zénith.
// On le trouve par deux recherches à une dimension sur l'API publique de SunCalc,
// plutôt qu'en réimplémentant l'astronomie.
//
// À l'équateur, altitude = cos(dec) * cos(H). Elle est maximale quand H = 0,
// c'est-à-dire exactement à la longitude subsolaire.
// Sur cette longitude, altitude(lat) = cos(lat - dec), maximale à lat = dec.
export function subsolarPoint(date) {
  const lng0 = argmax(-180, 180, (lng) => getPosition(date, 0, lng).altitude);
  const dec = argmax(-90, 90, (lat) => getPosition(date, lat, lng0).altitude);
  // Le raffinement de argmax avance par x ± pas et peut franchir la borne de quelques
  // millièmes de degré. Sans effet sur le rendu, les cosinus étant périodiques, mais on
  // ne renvoie pas une longitude hors domaine : elle est lue ailleurs et comparée.
  return {lng: wrapLongitude(lng0), lat: dec};
}

function wrapLongitude(lng) {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

// Recherche du maximum par balayage grossier puis raffinement dichotomique.
// La fonction est unimodale sur l'intervalle, la descente est donc sûre.
function argmax(lo, hi, f) {
  let best = lo;
  let bestVal = -Infinity;
  const coarse = 360;
  for (let i = 0; i <= coarse; i++) {
    const x = lo + ((hi - lo) * i) / coarse;
    const v = f(x);
    if (v > bestVal) { bestVal = v; best = x; }
  }
  let step = (hi - lo) / coarse;
  let x = best;
  for (let i = 0; i < 40; i++) {
    step /= 2;
    const left = f(x - step);
    const right = f(x + step);
    if (left > bestVal && left >= right) { x -= step; bestVal = left; }
    else if (right > bestVal) { x += step; bestVal = right; }
  }
  return x;
}

// Altitude du Soleil en degrés, forme fermée à partir du point subsolaire.
// Sert au rendu pixel par pixel : appeler SunCalc pour chaque point coûterait
// des centaines de milliers d'appels par image.
export function altitudeAt(lat, lng, sub) {
  const s = Math.sin(lat * RAD) * Math.sin(sub.lat * RAD)
          + Math.cos(lat * RAD) * Math.cos(sub.lat * RAD) * Math.cos((lng - sub.lng) * RAD);
  return Math.asin(Math.max(-1, Math.min(1, s))) * DEG;
}

// Ligne du terminateur : latitude où le Soleil touche l'horizon, pour une longitude donnée.
// tan(lat) = -cos(lng - lng0) / tan(dec).
// Quand dec approche 0 (équinoxes) le terminateur devient vertical et passe par les pôles ;
// le plancher sur tan(dec) évite la division par zéro sans fausser le tracé.
export function terminatorLat(lng, sub) {
  const t = Math.tan(sub.lat * RAD);
  const safe = Math.abs(t) < 1e-9 ? (t < 0 ? -1e-9 : 1e-9) : t;
  return Math.atan(-Math.cos((lng - sub.lng) * RAD) / safe) * DEG;
}

// Prochain coucher de soleil à cet endroit, à partir de `from`.
// SunCalc renvoie null quand l'événement n'existe pas ce jour-là (jour ou nuit polaire)
// et pose alors alwaysUp / alwaysDown. On avance jusqu'à trouver un vrai coucher,
// dans la limite d'un an, au-delà de quoi le lieu n'en a plus du tout.
export function nextSunset(from, lat, lng) {
  for (let i = 0; i < 370; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const t = getTimes(probe, lat, lng);
    if (t.sunset && t.sunset > from) return {at: t.sunset, polar: null};
    if (i === 0 && t.sunset === null) {
      // On note l'état polaire du jour même pour pouvoir l'expliquer à l'écran.
      const polar = t.alwaysUp ? 'day' : t.alwaysDown ? 'night' : null;
      const found = findLaterSunset(from);
      return found ? {at: found, polar} : {at: null, polar};
    }
  }
  return {at: null, polar: null};

  function findLaterSunset(start) {
    for (let i = 1; i < 370; i++) {
      const probe = new Date(start.getTime() + i * 86400000);
      const t = getTimes(probe, lat, lng);
      if (t.sunset && t.sunset > start) return t.sunset;
    }
    return null;
  }
}

export function nextSunrise(from, lat, lng) {
  for (let i = 0; i < 370; i++) {
    const probe = new Date(from.getTime() + i * 86400000);
    const t = getTimes(probe, lat, lng);
    if (t.sunrise && t.sunrise > from) return t.sunrise;
  }
  return null;
}

export function isDaylight(date, lat, lng) {
  return getPosition(date, lat, lng).altitude > -0.833;
}
