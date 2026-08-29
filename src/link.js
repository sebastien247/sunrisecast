// Encodage de la paire dans le fragment de l'URL.
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

const SEP = '|';

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
