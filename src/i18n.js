// Dictionnaires bilingues fr / en, et petites fonctions de traduction.
//
// Aucune dépendance : gabarits `{param}` remplacés par une simple regex, pas de moteur
// i18n. Les phrases à substitution utilisent des gabarits nommés entiers (jamais de
// concaténation de fragments traduits séparément) : coller des bouts traduits produit de
// l'anglais bancal dès que l'ordre des mots diffère du français.
//
// Textes repris de docs/growth/page.md quand une formulation existait déjà côté
// croissance (titre, sous-titre découpé en h1/lede, mention de confidentialité) ; le
// reste (boutons, labels de champs, messages dynamiques) est traduit ici faute
// d'équivalent déjà rédigé.

export const fr = {
  // ---- document
  pageTitle: 'SunriseCast — le même coucher de soleil',

  // ---- écran d'accueil
  heroTitle: 'Le soleil qui se couche sur elle<br>est le même qui se couchera sur vous.',
  heroLede: 'Il fait le tour de la Terre à 1 670 km/h. Choisissez deux endroits, on vous dit combien de temps il met pour aller de l’un à l’autre.',
  fieldALabel: 'Là où vous êtes',
  fieldAPlaceholder: 'Une ville, ou 48.86, 2.35',
  fieldBLabel: 'Là où elle est',
  fieldBPlaceholder: 'Une ville, ou -33.87, 151.21',
  goButton: 'Voir la ligne',
  privacyNote: 'Aucun compte, aucun serveur, aucune donnée enregistrée. Les deux lieux vivent uniquement dans le lien que vous vous partagez.',

  // ---- écran de vue
  mapAriaLabel: 'Carte du monde avec la ligne du coucher de soleil',
  todayHeading: 'Aujourd’hui',
  shareUrlAriaLabel: 'Lien à partager',
  copyButton: 'Copier le lien',
  shareButton: 'Partager',
  changeButton: 'Changer de lieux',
  howtoSummary: 'Le garder sous la main',
  howtoIphone: '<b>iPhone</b> — bouton Partager dans Safari, puis « Sur l’écran d’accueil ».',
  howtoAndroid: '<b>Android</b> — menu ⋮ de Chrome, puis « Ajouter à l’écran d’accueil ».',
  howtoLinkNote: 'Le lien contient tout. Rien n’est stocké ailleurs, rien ne se perd si vous changez de téléphone.',

  // ---- titre / sous-titre dynamiques
  sunsetIn: 'Le soleil se couche sur {place} dans {delta}.',
  justLeft: 'Le soleil vient de quitter {place}.',
  arrivesIn: 'Il arrivera sur {place} dans {delta}.',
  reachedAgo: 'Il a atteint {place} il y a {delta}.',
  polarNote: '{place} est en {polar} : le soleil n’y descend pas sous l’horizon en ce moment.',
  polarDayLower: 'jour polaire',
  polarNightLower: 'nuit polaire',
  separatedBy: 'Vous êtes séparés de {gap} de lumière.',
  noSunsetHeadline: 'Aucun coucher de soleil dans l’année à venir sur ces deux points.',
  noSunsetSubline: 'Les deux lieux sont en régime polaire permanent.',
  todayGap: 'La lumière met {gap} pour aller de l’un à l’autre aujourd’hui.',

  // ---- cartes lieu A / lieu B
  statusPolarDay: 'Jour polaire',
  statusPolarNight: 'Nuit polaire',
  statusDay: 'Il fait jour',
  statusNight: 'Il fait nuit',
  localTimeSuffix: '{time} sur place',
  sunsetAt: 'Coucher à {time}',
  nextSunsetOn: 'Prochain coucher le {date}',

  // ---- bouton de notification
  notifyBlocked: 'Notifications bloquées',
  notifyScheduled: 'Vous serez prévenu(e) ✓',
  notifyDefault: 'Me prévenir',

  // ---- messages flash
  flashNotifyBlockedSettings: 'Notifications bloquées : à réactiver dans les réglages du navigateur.',
  flashNoSunsetSoon: 'Pas de coucher de soleil à venir là-bas pour l’instant.',
  flashSunsetTooFar: 'Le prochain coucher de soleil là-bas est trop loin pour être annoncé.',
  flashNotifyScheduled: 'Vous serez prévenu(e) avant le coucher de soleil.',
  flashLinkCopied: 'Lien copié',
  flashSelectManualCopy: 'Sélectionné, faites Ctrl+C',

  // ---- Notification navigateur
  notifTitle: 'Le coucher de soleil approche',
  notifBody: 'Il va bientôt se coucher sur {place}.',

  // ---- suggestions de saisie
  coordinatesLabel: 'Coordonnées {coords}',

  // ---- unités de durée (pluriel correct, jamais un « s » collé d'office)
  unitMinuteOne: '{n} minute',
  unitMinuteOther: '{n} minutes',
  unitHourOne: '{n} heure',
  unitHourOther: '{n} heures',
  deltaHourMin: '{h} h {mm}',
  deltaMinSec: '{m} min {ss}',
  deltaSeconds: '{s} s',
  relativeIn: 'dans {delta}',
  relativeAgo: 'il y a {delta}'
};

export const en = {
  // ---- document
  pageTitle: 'SunriseCast — The Same Sunset',

  // ---- setup screen
  heroTitle: 'The sunset she’s watching tonight<br>is the exact same one that will reach you later.',
  heroLede: 'It sweeps around the Earth at 1,670 km/h. Enter two places, and we’ll tell you how long it takes to travel from one to the other.',
  fieldALabel: 'Where you are',
  fieldAPlaceholder: 'A city, or 48.86, 2.35',
  fieldBLabel: 'Where she is',
  fieldBPlaceholder: 'A city, or -33.87, 151.21',
  goButton: 'See the line',
  privacyNote: 'No account, no server, nothing saved. The two places live only in the link you share with each other.',

  // ---- view screen
  mapAriaLabel: 'World map with the sunset line',
  todayHeading: 'Today',
  shareUrlAriaLabel: 'Link to share',
  copyButton: 'Copy link',
  shareButton: 'Share',
  changeButton: 'Change places',
  howtoSummary: 'Keep it handy',
  howtoIphone: '<b>iPhone</b> — Share button in Safari, then “Add to Home Screen”.',
  howtoAndroid: '<b>Android</b> — Chrome’s ⋮ menu, then “Add to Home screen”.',
  howtoLinkNote: 'The link contains everything. Nothing is stored elsewhere, nothing is lost if you switch phones.',

  // ---- dynamic headline / subline
  sunsetIn: 'The sun sets on {place} in {delta}.',
  justLeft: 'The sun has just left {place}.',
  arrivesIn: 'It will reach {place} in {delta}.',
  reachedAgo: 'It reached {place} {delta} ago.',
  polarNote: '{place} is in {polar} right now — the sun doesn’t dip below the horizon there.',
  polarDayLower: 'polar day',
  polarNightLower: 'polar night',
  separatedBy: 'You’re separated by {gap} of light.',
  noSunsetHeadline: 'No sunset in the coming year at either point.',
  noSunsetSubline: 'Both places are in permanent polar conditions.',
  todayGap: 'Light takes {gap} to travel from one to the other today.',

  // ---- place A / place B cards
  statusPolarDay: 'Polar day',
  statusPolarNight: 'Polar night',
  statusDay: 'It’s daytime',
  statusNight: 'It’s nighttime',
  localTimeSuffix: '{time} local time',
  sunsetAt: 'Sunset at {time}',
  nextSunsetOn: 'Next sunset on {date}',

  // ---- notify button
  notifyBlocked: 'Notifications blocked',
  notifyScheduled: 'You’ll be notified ✓',
  notifyDefault: 'Notify me',

  // ---- flash messages
  flashNotifyBlockedSettings: 'Notifications blocked: re-enable them in your browser settings.',
  flashNoSunsetSoon: 'No sunset coming up there for now.',
  flashSunsetTooFar: 'The next sunset there is too far off to schedule a reminder.',
  flashNotifyScheduled: 'You’ll be notified before the sunset.',
  flashLinkCopied: 'Link copied',
  flashSelectManualCopy: 'Selected — press Ctrl+C',

  // ---- browser Notification
  notifTitle: 'Sunset is approaching',
  notifBody: 'It’s about to set on {place}.',

  // ---- search suggestions
  coordinatesLabel: 'Coordinates {coords}',

  // ---- duration units (correct plural, never a blind trailing "s")
  unitMinuteOne: '{n} minute',
  unitMinuteOther: '{n} minutes',
  unitHourOne: '{n} hour',
  unitHourOther: '{n} hours',
  deltaHourMin: '{h}h {mm}',
  deltaMinSec: '{m} min {ss}',
  deltaSeconds: '{s}s',
  relativeIn: 'in {delta}',
  relativeAgo: '{delta} ago'
};

const DICTIONARIES = {fr, en};

export const LANGS = ['fr', 'en'];

// Gabarit `{nom}` -> valeur. Jamais de concaténation de morceaux traduits séparément :
// un gabarit entier par phrase, pour que l'ordre des mots reste correct dans les deux
// langues même quand il diffère (« Le soleil se couche sur X » vs « The sun sets on X »).
export function t(lang, key, params) {
  const dict = DICTIONARIES[lang] || DICTIONARIES.en;
  let template = dict[key];
  if (template === undefined) template = DICTIONARIES.fr[key];
  if (template === undefined) return key; // filet de sécurité : jamais planter sur une clé absente
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

// Pluriel simple : le français et l'anglais partagent la même règle de coupure (singulier
// seulement à exactement 1), donc une seule fonction suffit pour les deux langues.
export function tCount(lang, n, singularKey, pluralKey, params) {
  return t(lang, n === 1 ? singularKey : pluralKey, {n, ...params});
}

export function localeTag(lang) {
  return lang === 'fr' ? 'fr-FR' : 'en-GB';
}

// `navigator.language` n'est fourni que par un vrai navigateur ; ce garde ne sert qu'à
// ne pas planter dans un contexte non-navigateur (jamais atteint en production).
export function detectLanguage() {
  const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || '';
  return String(nav).toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const STORAGE_KEY = 'sunrisecast:lang';

// En navigation privée (ou politique d'entreprise), l'accès à localStorage peut lever :
// échec silencieux, l'app doit fonctionner quand même en retombant sur la détection.
export function loadStoredLanguage() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'fr' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export function storeLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // idem : ce n'est pas bloquant, seulement la mémorisation qui échoue.
  }
}
