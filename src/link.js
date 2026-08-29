// Encodage de la paire dans le fragment de l'URL. Voir aussi localizedName() plus bas,
// qui corrige au DÉCODAGE (jamais à l'encodage) le nom d'affichage d'un lieu déjà connu
// de CITIES : un lien créé en français transporte « Lisbonne », et une interface
// anglaise doit pouvoir en tirer « Lisbon » sans que cela touche au lien lui-même.
//
// Le fragment (#) n'est jamais envoyé au serveur, jamais journalisé, jamais mis en cache
// par un intermédiaire. Les deux lieux vivent uniquement dans le lien que les deux
// personnes se partagent. C'est ce qui permet de n'avoir ni compte, ni base de données.
//
// Format lisible plutôt qu'opaque : quelqu'un qui reçoit le lien doit pouvoir voir
// ce qu'il contient avant de cliquer.
//   #a=Lisbonne|Portugal|38.72|-9.14|Europe/Lisbon&b=Montr%C3%A9al|Canada|45.5|-73.57|America/Toronto&l=en
//
// Le paramètre `l` (langue choisie par l'expéditeur au moment du partage) est facultatif
// et purement additif : un lien déjà partagé sans ce paramètre continue à se décoder
// exactement comme avant (l'appelant retombe alors sur sa propre détection automatique).
// encodePair/buildUrl gardent leur signature à deux arguments valide pour tout appel
// existant — le paramètre de langue est un 3e argument optionnel, jamais requis.

import {CITIES} from './data/cities.js';

const SEP = '|';

// Marge autour des coordonnées décodées pour retrouver la ville d'origine dans CITIES.
// encodePlace arrondit à 4 décimales (round() plus bas) : l'erreur d'arrondi réelle est
// donc négligeable (< 0,0001°). 0,05° reste largement au-dessus de ça et couvre aussi
// l'écart entre la précision à 4 décimales du lien et la précision à 2 décimales
// stockée dans CITIES.
const CITY_MATCH_TOLERANCE = 0.05;

export function encodePair(a, b, lang) {
  const params = new URLSearchParams();
  params.set('a', encodePlace(a));
  params.set('b', encodePlace(b));
  if (lang) params.set('l', lang);
  return '#' + params.toString();
}

export function buildUrl(a, b, base = location.href, lang) {
  const url = new URL(base);
  url.hash = '';
  return url.toString().replace(/#$/, '') + encodePair(a, b, lang);
}

export function decodePair(hash = location.hash) {
  const raw = String(hash).replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const a = decodePlace(params.get('a'));
  const b = decodePlace(params.get('b'));
  if (!a || !b) return null;
  return {a, b, lang: decodeLang(params.get('l'))};
}

// Seules 'fr' et 'en' sont des langues connues : toute autre valeur (absente, corrompue,
// ou une langue future non encore supportée) redevient null, et l'appelant retombe sur
// sa détection automatique — jamais de langue inventée à partir d'une valeur invalide.
function decodeLang(value) {
  return value === 'fr' || value === 'en' ? value : null;
}

function encodePlace(p) {
  return [p.name, p.country || '', round(p.lat), round(p.lng), p.tz || ''].join(SEP);
}

function decodePlace(value) {
  if (!value) return null;
  const parts = value.split(SEP);
  if (parts.length < 4) return null;
  const [name, country, lat, lng, tz] = parts;
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!isFinite(latitude) || !isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return {
    name: (name || '').slice(0, 60) || 'Sans nom',
    country: (country || '').slice(0, 60),
    lat: latitude,
    lng: longitude,
    tz: isValidTimeZone(tz) ? tz : null
  };
}

// Un fuseau inconnu du navigateur ferait planter Intl.DateTimeFormat.
// On vérifie avant de le garder ; sinon on retombe sur l'affichage en heure relative.
function isValidTimeZone(tz) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('fr-FR', {timeZone: tz}).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function round(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

// Nom d'affichage d'un lieu décodé, dans la langue courante de l'interface — PAS le
// nom encodé dans le lien, qui ne change jamais (voir l'en-tête du fichier).
//
// Cherche dans CITIES la ville la plus proche des coordonnées de `place`, à
// CITY_MATCH_TOLERANCE près sur chaque axe. Si on la trouve, on rend son nom dans la
// langue demandée (colonne fr ou colonne en de CITIES). Sinon on rend le nom du lien
// tel quel : une position saisie à la main (coordonnées libres, jamais dans CITIES)
// n'a par construction pas de traduction et ne doit jamais être renommée.
//
// N'appelle jamais ceci pour reconstruire un lien à partager (encodePair / buildUrl) :
// ce serait réencoder le nom localisé plutôt que le nom d'origine, et deux personnes en
// langues différentes produiraient alors des URL divergentes pour la même paire.
export function localizedName(place, lang) {
  if (!place) return place;
  let best = null;
  let bestDist = Infinity;
  for (const c of CITIES) {
    const dLat = Math.abs(c[2] - place.lat);
    const dLng = Math.abs(c[3] - place.lng);
    if (dLat > CITY_MATCH_TOLERANCE || dLng > CITY_MATCH_TOLERANCE) continue;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  if (!best) return place.name;
  return lang === 'en' ? best[5] : best[0];
}
