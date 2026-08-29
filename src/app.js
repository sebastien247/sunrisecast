import {subsolarPoint, nextSunset, nextSunrise, isDaylight} from './sun.js';
import {render} from './map.js';
import {searchCities, toPlace} from './data/cities.js';
import {decodePair, buildUrl, encodePair} from './link.js';
import {t, tCount, localeTag, detectLanguage, loadStoredLanguage, storeLanguage} from './i18n.js';
import * as SunCalc from './vendor/suncalc.js';

const COLOR_A = '#ffce7a';
const COLOR_B = '#8fd3ff';

const el = (id) => document.getElementById(id);
const state = {pair: null, timer: null, lastMapPaint: 0, notifyTimer: null, lang: 'en'};

// ---------------------------------------------------------------- calculs

// Le coucher de soleil chez B qui appartient à la même vague que celui de A.
// On cherche celui dont l'instant est le plus proche, dans une fenêtre de plus ou moins
// 36 heures : deux couchers consécutifs étant espacés d'environ 24 h, le plus proche est
// toujours à moins de 12 h, ce qui est bien le décalage réel de la lumière entre les deux lieux.
function matchingSunset(target, place) {
  let best = null;
  for (let d = -2; d <= 2; d++) {
    const probe = new Date(target.getTime() + d * 86400000 - 43200000);
    const s = nextSunset(probe, place.lat, place.lng);
    if (!s.at) continue;
    const gap = Math.abs(s.at - target);
    if (!best || gap < Math.abs(best - target)) best = s.at;
  }
  return best;
}

function computeMoment(now, a, b) {
  const sa = nextSunset(now, a.lat, a.lng);
  const sb = nextSunset(now, b.lat, b.lng);

  // Aucun des deux n'a de coucher à venir dans l'année : cas extrême, on le dit.
  if (!sa.at && !sb.at) return {impossible: true, polarA: sa.polar, polarB: sb.polar};

  // Celui dont le coucher arrive le premier est celui que la lumière quitte en premier.
  const aFirst = sa.at && (!sb.at || sa.at <= sb.at);
  const first = aFirst ? {place: a, at: sa.at, polar: sa.polar} : {place: b, at: sb.at, polar: sb.polar};
  const otherPlace = aFirst ? b : a;
  const otherAt = matchingSunset(first.at, otherPlace);

  return {
    impossible: false,
    first,
    second: {place: otherPlace, at: otherAt, polar: aFirst ? sb.polar : sa.polar},
    gapMs: otherAt ? otherAt - first.at : null,
    polarA: sa.polar,
    polarB: sb.polar
  };
}

// ---------------------------------------------------------------- formats

function pad2(n) {
  return String(n).padStart(2, '0');
}

// Gabarits entiers par cas (jamais de fragments traduits recollés) : la position des
// unités par rapport au nombre change d'une langue à l'autre (« 4h 26 » sans espace en
// anglais, « 4 h 26 » avec espace en français), donc c'est le dictionnaire qui décide.
function formatDelta(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return t(state.lang, 'deltaHourMin', {h, mm: pad2(m)});
  if (m > 0) return t(state.lang, 'deltaMinSec', {m, ss: pad2(sec)});
  return t(state.lang, 'deltaSeconds', {s: sec});
}

// Pluriel correct dans les deux langues (jamais de « s » collé d'office : « 1 heure »,
// pas « 1 heures »).
function formatGap(ms) {
  const totalMin = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return tCount(state.lang, m, 'unitMinuteOne', 'unitMinuteOther');
  if (m === 0) return tCount(state.lang, h, 'unitHourOne', 'unitHourOther');
  return t(state.lang, 'deltaHourMin', {h, mm: pad2(m)});
}

// Correctif : `timeZone: place.tz || undefined` faisait retomber Intl sur le fuseau
// du navigateur quand `place.tz` est null (coordonnées saisies à la main), donc
// affichait une heure qui a l'air juste mais ne l'est pas pour ce lieu-là. On refuse
// maintenant explicitement de formater une heure absolue sans fuseau connu.
function localTime(date, place) {
  if (!date || !place.tz) return null;
  try {
    return new Intl.DateTimeFormat(localeTag(state.lang), {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: place.tz
    }).format(date);
  } catch {
    return null;
  }
}

// Comme localTime, mais avec le jour de la semaine : sert au bloc « aujourd'hui »
// où deux heures de deux fuseaux différents doivent rester non-ambiguës.
function absoluteTimeLabel(date, place) {
  if (!date || !place.tz) return null;
  try {
    return new Intl.DateTimeFormat(localeTag(state.lang), {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: place.tz
    }).format(date);
  } catch {
    return null;
  }
}

// Fuseau inconnu (coordonnées brutes) : jamais d'heure absolue inventée, seulement
// un delta relatif à maintenant, qui reste vrai quel que soit le fuseau réel du lieu.
function relativeTimeLabel(date, now) {
  if (!date) return null;
  const diff = date.getTime() - now.getTime();
  return diff >= 0
    ? t(state.lang, 'relativeIn', {delta: formatDelta(diff)})
    : t(state.lang, 'relativeAgo', {delta: formatDelta(-diff)});
}

// ---------------------------------------------------------------- rendu

function paint() {
  const now = new Date();
  const {a, b} = state.pair;
  const moment = computeMoment(now, a, b);

  updateToday(now, a, b, moment);

  // La carte change lentement : la repeindre chaque seconde serait du gaspillage,
  // et le terminateur ne bouge que d'un quart de degré par minute.
  if (now - state.lastMapPaint > 4000) {
    state.lastMapPaint = now;
    render(el('map'), {
      sub: subsolarPoint(now),
      places: [
        {...a, key: 'a', color: COLOR_A},
        {...b, key: 'b', color: COLOR_B}
      ],
      highlight: moment.impossible ? null : moment.first.place === a ? 'a' : 'b'
    });
  }

  if (moment.impossible) {
    el('headline').textContent = t(state.lang, 'noSunsetHeadline');
    el('subline').textContent = t(state.lang, 'noSunsetSubline');
    el('gap').textContent = '';
    return;
  }

  const {first, second, gapMs} = moment;
  const untilFirst = first.at - now;

  const headline = untilFirst > 0
    ? t(state.lang, 'sunsetIn', {place: first.place.name, delta: formatDelta(untilFirst)})
    : t(state.lang, 'justLeft', {place: first.place.name});
  el('headline').textContent = headline;

  if (second.at) {
    const untilSecond = second.at - now;
    el('subline').textContent = untilSecond > 0
      ? t(state.lang, 'arrivesIn', {place: second.place.name, delta: formatDelta(untilSecond)})
      : t(state.lang, 'reachedAgo', {place: second.place.name, delta: formatDelta(-untilSecond)});
  } else {
    const polar = t(state.lang, second.polar === 'day' ? 'polarDayLower' : 'polarNightLower');
    el('subline').textContent = t(state.lang, 'polarNote', {place: second.place.name, polar});
  }

  el('gap').textContent = gapMs
    ? t(state.lang, 'separatedBy', {gap: formatGap(gapMs)})
    : '';

  fillCard('card-a', a, now, COLOR_A);
  fillCard('card-b', b, now, COLOR_B);
}

// Bloc « aujourd'hui » : l'heure exacte des deux couchers, chacun dans son propre
// fuseau, et la durée que met la lumière pour aller de l'un à l'autre. Reprend les
// mêmes instants que le calcul de `moment` (first/second) plutôt que de rappeler
// nextSunset : deux appels distincts pourraient tomber de part et d'autre de minuit
// et désynchroniser les deux affichages d'un jour entier.
function updateToday(now, a, b, moment) {
  const section = el('today');
  if (moment.impossible) { section.hidden = true; return; }
  section.hidden = false;

  const {first, second, gapMs} = moment;
  const atFor = (place) => (first.place === place ? first.at : second.at);

  fillTodayItem('today-a', a, atFor(a), now);
  fillTodayItem('today-b', b, atFor(b), now);

  el('today-gap').textContent = gapMs
    ? t(state.lang, 'todayGap', {gap: formatGap(gapMs)})
    : '';
}

function fillTodayItem(prefix, place, at, now) {
  el(`${prefix}-name`).textContent = place.name;
  const time = el(`${prefix}-time`);
  if (!at) {
    // Nuit ou jour polaire ce cycle-ci : rien à afficher, le statut est déjà
    // expliqué par ailleurs (headline / subline / status de la carte).
    time.textContent = '—';
    return;
  }
  const absolute = absoluteTimeLabel(at, place);
  time.textContent = absolute || relativeTimeLabel(at, now);
}

function fillCard(id, place, now, color) {
  const card = el(id);
  const set = nextSunset(now, place.lat, place.lng);
  const day = isDaylight(now, place.lat, place.lng);
  const time = localTime(now, place);
  const setTime = localTime(set.at, place);

  card.querySelector('.dot').style.background = color;
  card.querySelector('.city').textContent = place.name;
  card.querySelector('.country').textContent = place.country || '';
  card.querySelector('.clock').textContent = time ? t(state.lang, 'localTimeSuffix', {time}) : '';

  const status = card.querySelector('.status');
  if (set.polar === 'day') status.textContent = t(state.lang, 'statusPolarDay');
  else if (set.polar === 'night') status.textContent = t(state.lang, 'statusPolarNight');
  else status.textContent = t(state.lang, day ? 'statusDay' : 'statusNight');

  const detail = card.querySelector('.detail');
  if (set.at && setTime) detail.textContent = t(state.lang, 'sunsetAt', {time: setTime});
  else if (set.at) detail.textContent = t(state.lang, 'nextSunsetOn', {date: set.at.toLocaleDateString(localeTag(state.lang))});
  else detail.textContent = '';
}

// ---------------------------------------------------------------- écrans

function showPair(pair) {
  state.pair = pair;
  el('setup').hidden = true;
  el('view').hidden = false;
  el('share-url').value = buildUrl(pair.a, pair.b, undefined, state.lang);
  state.lastMapPaint = 0;
  // Une paire nouvellement affichée invalide toute notification programmée pour
  // l'ancienne : on ne reprogramme pas automatiquement, il faut recliquer « Me
  // prévenir » — sinon on notifierait pour un lieu que l'écran ne montre plus.
  clearScheduledNotification();
  paint();
  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(paint, 1000);
}

function showSetup() {
  el('setup').hidden = false;
  el('view').hidden = true;
  clearScheduledNotification();
  if (state.timer) clearInterval(state.timer);
}

// ---------------------------------------------------------------- langue

// Priorité au démarrage : préférence mémorisée > détection navigator.language.
// Le paramètre `l` d'un lien reçu est traité séparément, dans route() : il doit primer
// pour CETTE vue précise (« le destinataire doit voir la langue choisie par
// l'expéditeur »), sans pour autant écraser silencieusement la préférence mémorisée du
// destinataire pour ses prochaines visites — donc on ne la persiste pas ici.
function initialLanguage() {
  return loadStoredLanguage() || detectLanguage();
}

function applyStaticTranslations() {
  const lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(lang, node.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    node.innerHTML = t(lang, node.getAttribute('data-i18n-html'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(lang, node.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(lang, node.getAttribute('data-i18n-aria-label')));
  });
  document.title = t(lang, 'pageTitle');
}

function updateLangButtons() {
  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === state.lang));
  });
}

// Applique une langue déjà déterminée (démarrage, ou lien reçu contenant `l=`) : ne
// touche PAS au fragment d'URL courant. `persist` contrôle si ce choix devient la
// préférence mémorisée pour les prochaines visites.
function applyLanguage(lang, {persist} = {persist: false}) {
  state.lang = lang;
  if (persist) storeLanguage(lang);
  document.documentElement.lang = lang;
  applyStaticTranslations();
  updateLangButtons();
  updateNotifyButton();
}

// Clic explicite sur le sélecteur : un choix délibéré, donc mémorisé, et qui doit
// voyager dans le lien si une paire est déjà affichée (pour que le prochain partage
// respecte la langue qu'on vient de choisir).
function onLangButtonClick(lang) {
  if (lang === state.lang) return;
  applyLanguage(lang, {persist: true});
  if (state.pair) {
    const hash = encodePair(state.pair.a, state.pair.b, lang);
    if (location.hash === hash) {
      el('share-url').value = buildUrl(state.pair.a, state.pair.b, undefined, lang);
      paint();
    } else {
      // Déclenche hashchange -> route() : state.lang est déjà à jour, route() ne
      // fait donc rien de plus que réafficher la paire avec la langue courante.
      location.hash = hash;
    }
  }
}

// ---------------------------------------------------------------- notification

// `Notification` + `setTimeout` tant que l'onglet vit : pas de service worker push,
// pas d'accord serveur à obtenir. La permission n'est JAMAIS demandée au chargement,
// seulement sur ce clic explicite — c'est le seul geste qui ne fait pas refuser les
// gens en masse. Si la permission est refusée, on ne la redemande plus jamais.
function supportsNotifications() {
  return typeof Notification !== 'undefined';
}

async function onNotifyClick() {
  if (!supportsNotifications()) return;
  if (Notification.permission === 'denied') {
    flash(t(state.lang, 'flashNotifyBlockedSettings'));
    return;
  }
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  updateNotifyButton();
  if (permission !== 'granted') return;
  scheduleNotification();
}

// Prévient avant le coucher de soleil du lieu B (« Là où elle est » au moment de la
// saisie) : c'est l'instant où la lumière achève sa traversée entre les deux personnes,
// le cœur émotionnel du produit.
const NOTIFY_LEAD_MS = 5 * 60 * 1000;
const MAX_SET_TIMEOUT_MS = 2 ** 31 - 1; // au-delà, setTimeout déborde et se déclenche tout de suite

function scheduleNotification() {
  clearScheduledNotification();
  if (!state.pair) return;
  const {b} = state.pair;
  const now = new Date();
  const set = nextSunset(now, b.lat, b.lng);
  if (!set.at) {
    flash(t(state.lang, 'flashNoSunsetSoon'));
    return;
  }
  const delay = Math.max(1000, set.at.getTime() - NOTIFY_LEAD_MS - now.getTime());
  if (delay >= MAX_SET_TIMEOUT_MS) {
    flash(t(state.lang, 'flashSunsetTooFar'));
    return;
  }
  state.notifyTimer = setTimeout(() => {
    state.notifyTimer = null;
    try {
      new Notification(t(state.lang, 'notifTitle'), {
        body: t(state.lang, 'notifBody', {place: b.name}),
        tag: 'sunrisecast-sunset'
      });
    } catch {
      // Certains navigateurs (notamment mobiles) refusent `new Notification` hors
      // service worker : échec silencieux, l'app continue de fonctionner sans.
    }
    updateNotifyButton();
  }, delay);
  flash(t(state.lang, 'flashNotifyScheduled'));
  updateNotifyButton();
}

function clearScheduledNotification() {
  if (state.notifyTimer) clearTimeout(state.notifyTimer);
  state.notifyTimer = null;
}

function updateNotifyButton() {
  const btn = el('notify');
  if (!btn) return;
  if (!supportsNotifications()) { btn.hidden = true; return; }
  if (Notification.permission === 'denied') {
    btn.disabled = true;
    btn.textContent = t(state.lang, 'notifyBlocked');
  } else if (state.notifyTimer) {
    btn.disabled = false;
    btn.textContent = t(state.lang, 'notifyScheduled');
  } else {
    btn.disabled = false;
    btn.textContent = t(state.lang, 'notifyDefault');
  }
}

// ---------------------------------------------------------------- service worker

// Enregistré depuis l'app, jamais bloquant : le site doit marcher même si le
// service worker est refusé (navigation privée, politique d'entreprise, navigateur
// qui ne le supporte pas). D'où le `catch` silencieux et le garde `in navigator`.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ---------------------------------------------------------------- saisie

// Accepte une ville de la liste, ou des coordonnées brutes « 48.86, 2.35 »
// pour tout endroit qui n'y figure pas.
function parseCoords(text) {
  const m = String(text).trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lng = Number(m[2].replace(',', '.'));
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {name: `${lat.toFixed(2)}, ${lng.toFixed(2)}`, country: '', lat, lng, tz: null};
}

function wirePicker(slot) {
  const input = el(`input-${slot}`);
  const list = el(`list-${slot}`);
  let chosen = null;

  const clear = () => { list.innerHTML = ''; list.hidden = true; };

  const choose = (place) => {
    chosen = place;
    input.value = place.country ? `${place.name}, ${place.country}` : place.name;
    clear();
    input.dataset.ok = '1';
    update();
  };

  input.addEventListener('input', () => {
    input.dataset.ok = '';
    chosen = null;
    const q = input.value;
    const coords = parseCoords(q);
    const hits = coords ? [coords] : searchCities(q, state.lang);
    list.innerHTML = '';
    if (!hits.length) { clear(); update(); return; }
    for (const p of hits) {
      const li = document.createElement('li');
      li.textContent = p.country ? `${p.name} — ${p.country}` : t(state.lang, 'coordinatesLabel', {coords: p.name});
      li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(p); });
      list.appendChild(li);
    }
    list.hidden = false;
    update();
  });

  input.addEventListener('blur', () => setTimeout(clear, 120));

  return {get: () => chosen};
}

let pickerA, pickerB;

function update() {
  el('go').disabled = !(pickerA.get() && pickerB.get());
}

// ---------------------------------------------------------------- démarrage

function boot() {
  applyLanguage(initialLanguage(), {persist: false});

  pickerA = wirePicker('a');
  pickerB = wirePicker('b');

  document.querySelectorAll('.lang-switch button').forEach((btn) => {
    btn.addEventListener('click', () => onLangButtonClick(btn.dataset.lang));
  });

  // On pose le fragment et on laisse `hashchange` faire le rendu :
  // un seul chemin d'entrée, que l'on arrive par le bouton ou par un lien reçu.
  el('go').addEventListener('click', () => {
    const a = pickerA.get();
    const b = pickerB.get();
    if (!a || !b) return;
    const hash = encodePair(a, b, state.lang);
    if (location.hash === hash) showPair({a, b});
    else location.hash = hash;
  });

  // Une seule fois, pas à chaque changement de lieux : sinon les écouteurs s'empilent.
  addEventListener('resize', () => { state.lastMapPaint = 0; });

  el('copy').addEventListener('click', async () => {
    const url = el('share-url').value;
    try {
      await navigator.clipboard.writeText(url);
      flash(t(state.lang, 'flashLinkCopied'));
    } catch {
      el('share-url').select();
      flash(t(state.lang, 'flashSelectManualCopy'));
    }
  });

  el('share').addEventListener('click', async () => {
    const url = el('share-url').value;
    const text = `${el('headline').textContent} ${el('subline').textContent}`;
    if (navigator.share) {
      try { await navigator.share({title: 'SunriseCast', text, url}); } catch { /* annulé */ }
    } else {
      el('copy').click();
    }
  });

  el('change').addEventListener('click', () => {
    location.hash = '';
    showSetup();
  });

  el('notify').addEventListener('click', onNotifyClick);
  updateNotifyButton();

  addEventListener('hashchange', route);
  route();
  registerServiceWorker();
}

function flash(msg) {
  const n = el('flash');
  n.textContent = msg;
  n.classList.add('on');
  setTimeout(() => n.classList.remove('on'), 1600);
}

function route() {
  const pair = decodePair();
  if (pair) {
    // La langue du lien prime pour cette vue précise (voir applyLanguage) : elle
    // n'est pas mémorisée, seulement affichée.
    if (pair.lang && pair.lang !== state.lang) applyLanguage(pair.lang, {persist: false});
    showPair(pair);
  } else {
    showSetup();
  }
}

// Exposé pour l'inspection manuelle en console pendant les tests.
window.SunriseCast = {SunCalc, subsolarPoint, nextSunset, nextSunrise, computeMoment, toPlace};

boot();
