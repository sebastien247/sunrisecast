// Liste volontairement courte et sûre : les villes que l'on sait situer et fuseau-horaire
// avec certitude. Toute autre position passe par la saisie manuelle de coordonnées.
// [nom, pays, latitude, longitude, fuseau IANA]
export const CITIES = [
  ['Paris', 'France', 48.86, 2.35, 'Europe/Paris'],
  ['Marseille', 'France', 43.30, 5.37, 'Europe/Paris'],
  ['Lyon', 'France', 45.76, 4.84, 'Europe/Paris'],
  ['Bordeaux', 'France', 44.84, -0.58, 'Europe/Paris'],
  ['Nice', 'France', 43.70, 7.27, 'Europe/Paris'],
  ['Bruxelles', 'Belgique', 50.85, 4.35, 'Europe/Brussels'],
  ['Genève', 'Suisse', 46.20, 6.14, 'Europe/Zurich'],
  ['Londres', 'Royaume-Uni', 51.51, -0.13, 'Europe/London'],
  ['Dublin', 'Irlande', 53.35, -6.26, 'Europe/Dublin'],
  ['Lisbonne', 'Portugal', 38.72, -9.14, 'Europe/Lisbon'],
  ['Porto', 'Portugal', 41.15, -8.61, 'Europe/Lisbon'],
  ['Madrid', 'Espagne', 40.42, -3.70, 'Europe/Madrid'],
  ['Barcelone', 'Espagne', 41.39, 2.17, 'Europe/Madrid'],
  ['Rome', 'Italie', 41.90, 12.50, 'Europe/Rome'],
  ['Milan', 'Italie', 45.46, 9.19, 'Europe/Rome'],
  ['Berlin', 'Allemagne', 52.52, 13.40, 'Europe/Berlin'],
  ['Munich', 'Allemagne', 48.14, 11.58, 'Europe/Berlin'],
  ['Amsterdam', 'Pays-Bas', 52.37, 4.90, 'Europe/Amsterdam'],
  ['Copenhague', 'Danemark', 55.68, 12.57, 'Europe/Copenhagen'],
  ['Stockholm', 'Suède', 59.33, 18.07, 'Europe/Stockholm'],
  ['Oslo', 'Norvège', 59.91, 10.75, 'Europe/Oslo'],
  ['Tromsø', 'Norvège', 69.65, 18.96, 'Europe/Oslo'],
  ['Helsinki', 'Finlande', 60.17, 24.94, 'Europe/Helsinki'],
  ['Varsovie', 'Pologne', 52.23, 21.01, 'Europe/Warsaw'],
  ['Prague', 'Tchéquie', 50.08, 14.44, 'Europe/Prague'],
  ['Vienne', 'Autriche', 48.21, 16.37, 'Europe/Vienna'],
  ['Budapest', 'Hongrie', 47.50, 19.04, 'Europe/Budapest'],
  ['Bucarest', 'Roumanie', 44.43, 26.10, 'Europe/Bucharest'],
  ['Athènes', 'Grèce', 37.98, 23.73, 'Europe/Athens'],
  ['Istanbul', 'Turquie', 41.01, 28.98, 'Europe/Istanbul'],
  ['Kiev', 'Ukraine', 50.45, 30.52, 'Europe/Kyiv'],
  ['Moscou', 'Russie', 55.76, 37.62, 'Europe/Moscow'],
  ['Reykjavik', 'Islande', 64.15, -21.94, 'Atlantic/Reykjavik'],
  ['Casablanca', 'Maroc', 33.57, -7.59, 'Africa/Casablanca'],
  ['Marrakech', 'Maroc', 31.63, -8.01, 'Africa/Casablanca'],
  ['Alger', 'Algérie', 36.75, 3.06, 'Africa/Algiers'],
  ['Tunis', 'Tunisie', 36.81, 10.18, 'Africa/Tunis'],
  ['Le Caire', 'Égypte', 30.04, 31.24, 'Africa/Cairo'],
  ['Dakar', 'Sénégal', 14.69, -17.45, 'Africa/Dakar'],
  ['Abidjan', 'Côte d’Ivoire', 5.36, -4.01, 'Africa/Abidjan'],
  ['Lagos', 'Nigeria', 6.52, 3.38, 'Africa/Lagos'],
  ['Nairobi', 'Kenya', -1.29, 36.82, 'Africa/Nairobi'],
  ['Le Cap', 'Afrique du Sud', -33.92, 18.42, 'Africa/Johannesburg'],
  ['Johannesburg', 'Afrique du Sud', -26.20, 28.05, 'Africa/Johannesburg'],
  ['Dubaï', 'Émirats', 25.20, 55.27, 'Asia/Dubai'],
  ['Tel Aviv', 'Israël', 32.09, 34.78, 'Asia/Jerusalem'],
  ['Beyrouth', 'Liban', 33.89, 35.50, 'Asia/Beirut'],
  ['Téhéran', 'Iran', 35.69, 51.39, 'Asia/Tehran'],
  ['Karachi', 'Pakistan', 24.86, 67.01, 'Asia/Karachi'],
  ['Delhi', 'Inde', 28.61, 77.21, 'Asia/Kolkata'],
  ['Mumbai', 'Inde', 19.08, 72.88, 'Asia/Kolkata'],
  ['Bangalore', 'Inde', 12.97, 77.59, 'Asia/Kolkata'],
  ['Colombo', 'Sri Lanka', 6.93, 79.86, 'Asia/Colombo'],
  ['Bangkok', 'Thaïlande', 13.76, 100.50, 'Asia/Bangkok'],
  ['Hanoï', 'Viêt Nam', 21.03, 105.85, 'Asia/Ho_Chi_Minh'],
  ['Hô Chi Minh-Ville', 'Viêt Nam', 10.82, 106.63, 'Asia/Ho_Chi_Minh'],
  ['Singapour', 'Singapour', 1.35, 103.82, 'Asia/Singapore'],
  ['Jakarta', 'Indonésie', -6.21, 106.85, 'Asia/Jakarta'],
  ['Manille', 'Philippines', 14.60, 120.98, 'Asia/Manila'],
  ['Hong Kong', 'Hong Kong', 22.32, 114.17, 'Asia/Hong_Kong'],
  ['Shanghai', 'Chine', 31.23, 121.47, 'Asia/Shanghai'],
  ['Pékin', 'Chine', 39.90, 116.41, 'Asia/Shanghai'],
  ['Séoul', 'Corée du Sud', 37.57, 126.98, 'Asia/Seoul'],
  ['Tokyo', 'Japon', 35.68, 139.69, 'Asia/Tokyo'],
  ['Osaka', 'Japon', 34.69, 135.50, 'Asia/Tokyo'],
  ['Sydney', 'Australie', -33.87, 151.21, 'Australia/Sydney'],
  ['Melbourne', 'Australie', -37.81, 144.96, 'Australia/Melbourne'],
  ['Perth', 'Australie', -31.95, 115.86, 'Australia/Perth'],
  ['Auckland', 'Nouvelle-Zélande', -36.85, 174.76, 'Pacific/Auckland'],
  ['Nouméa', 'Nouvelle-Calédonie', -22.28, 166.46, 'Pacific/Noumea'],
  ['Papeete', 'Polynésie française', -17.54, -149.57, 'Pacific/Tahiti'],
  ['Honolulu', 'Hawaï', 21.31, -157.86, 'Pacific/Honolulu'],
  ['Anchorage', 'Alaska', 61.22, -149.90, 'America/Anchorage'],
  ['Vancouver', 'Canada', 49.28, -123.12, 'America/Vancouver'],
  ['Montréal', 'Canada', 45.50, -73.57, 'America/Toronto'],
  ['Toronto', 'Canada', 43.65, -79.38, 'America/Toronto'],
  ['Québec', 'Canada', 46.81, -71.21, 'America/Toronto'],
  ['New York', 'États-Unis', 40.71, -74.01, 'America/New_York'],
  ['Chicago', 'États-Unis', 41.88, -87.63, 'America/Chicago'],
  ['Denver', 'États-Unis', 39.74, -104.99, 'America/Denver'],
  ['Los Angeles', 'États-Unis', 34.05, -118.24, 'America/Los_Angeles'],
  ['San Francisco', 'États-Unis', 37.77, -122.42, 'America/Los_Angeles'],
  ['Seattle', 'États-Unis', 47.61, -122.33, 'America/Los_Angeles'],
  ['Miami', 'États-Unis', 25.76, -80.19, 'America/New_York'],
  ['Mexico', 'Mexique', 19.43, -99.13, 'America/Mexico_City'],
  ['Fort-de-France', 'Martinique', 14.60, -61.07, 'America/Martinique'],
  ['Pointe-à-Pitre', 'Guadeloupe', 16.24, -61.53, 'America/Guadeloupe'],
  ['Cayenne', 'Guyane', 4.92, -52.33, 'America/Cayenne'],
  ['Saint-Denis', 'La Réunion', -20.88, 55.45, 'Indian/Reunion'],
  ['Bogotá', 'Colombie', 4.71, -74.07, 'America/Bogota'],
  ['Lima', 'Pérou', -12.05, -77.04, 'America/Lima'],
  ['Santiago', 'Chili', -33.45, -70.67, 'America/Santiago'],
  ['Buenos Aires', 'Argentine', -34.60, -58.38, 'America/Argentina/Buenos_Aires'],
  ['São Paulo', 'Brésil', -23.55, -46.63, 'America/Sao_Paulo'],
  ['Rio de Janeiro', 'Brésil', -22.91, -43.17, 'America/Sao_Paulo']
];

export function searchCities(query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  const hits = [];
  for (const c of CITIES) {
    const name = normalize(c[0]);
    const country = normalize(c[1]);
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.includes(q)) score = 1;
    else if (country.startsWith(q)) score = 2;
    else if (country.includes(q)) score = 3;
    if (score >= 0) hits.push([score, c]);
  }
  hits.sort((a, b) => a[0] - b[0] || a[1][0].localeCompare(b[1][0], 'fr'));
  return hits.slice(0, limit).map(([, c]) => toPlace(c));
}

export function toPlace(c) {
  return {name: c[0], country: c[1], lat: c[2], lng: c[3], tz: c[4]};
}

// NFD décompose les accents mais pas les lettres barrées ou ligaturées :
// ø, æ, œ, ß, ð, þ, ł restent intacts et feraient échouer une recherche sans diacritiques.
const LETTER_FOLD = {'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ð': 'd', 'þ': 'th', 'ł': 'l', 'đ': 'd'};

function normalize(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[øæœßðþłđ]/g, (ch) => LETTER_FOLD[ch])
    .trim();
}
