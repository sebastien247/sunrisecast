import {subsolarPoint, nextSunset, nextSunrise, isDaylight} from './sun.js';
import {render} from './map.js';
import {searchCities, toPlace} from './data/cities.js';
import {decodePair, buildUrl, encodePair} from './link.js';
import * as SunCalc from './vendor/suncalc.js';

const COLOR_A = '#ffce7a';
const COLOR_B = '#8fd3ff';

const el = (id) => document.getElementById(id);
const state = {pair: null, timer: null, lastMapPaint: 0, notifyTimer: null};

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

function formatDelta(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`;
  if (m > 0) return `${m} min ${String(sec).padStart(2, '0')}`;
  return `${sec} s`;
}

function formatGap(ms) {
  const totalMin = Math.round(Math.abs(ms) / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return h === 1 ? '1 heure' : `${h} heures`;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

// Correctif : `timeZone: place.tz || undefined` faisait retomber Intl sur le fuseau
// du navigateur quand `place.tz` est null (coordonnées saisies à la main), donc
// affichait une heure qui a l'air juste mais ne l'est pas pour ce lieu-là. On refuse
// maintenant explicitement de formater une heure absolue sans fuseau connu.
function localTime(date, place) {
  if (!date || !place.tz) return null;
  try {
    return new Intl.DateTimeFormat('fr-FR', {
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
    return new Intl.DateTimeFormat('fr-FR', {
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
  return diff >= 0 ? `dans ${formatDelta(diff)}` : `il y a ${formatDelta(-diff)}`;
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
    el('headline').textContent = 'Aucun coucher de soleil dans l’année à venir sur ces deux points.';
    el('subline').textContent = 'Les deux lieux sont en régime polaire permanent.';
    el('gap').textContent = '';
    return;
  }

  const {first, second, gapMs} = moment;
  const untilFirst = first.at - now;

  const headline = untilFirst > 0
    ? `Le soleil se couche sur ${first.place.name} dans ${formatDelta(untilFirst)}.`
    : `Le soleil vient de quitter ${first.place.name}.`;
  el('headline').textContent = headline;

  if (second.at) {
    const untilSecond = second.at - now;
    el('subline').textContent = untilSecond > 0
      ? `Il arrivera sur ${second.place.name} dans ${formatDelta(untilSecond)}.`
      : `Il a atteint ${second.place.name} il y a ${formatDelta(-untilSecond)}.`;
  } else {
    el('subline').textContent = `${second.place.name} est en ${second.polar === 'day' ? 'jour polaire' : 'nuit polaire'} : le soleil n’y descend pas sous l’horizon en ce moment.`;
  }

  el('gap').textContent = gapMs
    ? `Vous êtes séparés de ${formatGap(gapMs)} de lumière.`
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
    ? `La lumière met ${formatGap(gapMs)} pour aller de l’un à l’autre aujourd’hui.`
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
  card.querySelector('.clock').textContent = time ? `${time} sur place` : '';

  const status = card.querySelector('.status');
  if (set.polar === 'day') status.textContent = 'Jour polaire';
  else if (set.polar === 'night') status.textContent = 'Nuit polaire';
  else status.textContent = day ? 'Il fait jour' : 'Il fait nuit';

  const detail = card.querySelector('.detail');
  if (set.at && setTime) detail.textContent = `Coucher à ${setTime}`;
  else if (set.at) detail.textContent = `Prochain coucher le ${set.at.toLocaleDateString('fr-FR')}`;
  else detail.textContent = '';
}

// ---------------------------------------------------------------- écrans

function showPair(pair) {
  state.pair = pair;
  el('setup').hidden = true;
  el('view').hidden = false;
  el('share-url').value = buildUrl(pair.a, pair.b);
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
    flash('Notifications bloquées : à réactiver dans les réglages du navigateur.');
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
    flash('Pas de coucher de soleil à venir là-bas pour l’instant.');
    return;
  }
  const delay = Math.max(1000, set.at.getTime() - NOTIFY_LEAD_MS - now.getTime());
  if (delay >= MAX_SET_TIMEOUT_MS) {
    flash('Le prochain coucher de soleil là-bas est trop loin pour être annoncé.');
    return;
  }
  state.notifyTimer = setTimeout(() => {
    state.notifyTimer = null;
    try {
      new Notification('Le coucher de soleil approche', {
        body: `Il va bientôt se coucher sur ${b.name}.`,
        tag: 'sunrisecast-sunset'
      });
    } catch {
      // Certains navigateurs (notamment mobiles) refusent `new Notification` hors
      // service worker : échec silencieux, l'app continue de fonctionner sans.
    }
    updateNotifyButton();
  }, delay);
  flash('Vous serez prévenu(e) avant le coucher de soleil.');
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
    btn.textContent = 'Notifications bloquées';
  } else if (state.notifyTimer) {
    btn.disabled = false;
    btn.textContent = 'Vous serez prévenu(e) ✓';
  } else {
    btn.disabled = false;
    btn.textContent = 'Me prévenir';
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
    const hits = coords ? [coords] : searchCities(q);
    list.innerHTML = '';
    if (!hits.length) { clear(); update(); return; }
    for (const p of hits) {
      const li = document.createElement('li');
      li.textContent = p.country ? `${p.name} — ${p.country}` : `Coordonnées ${p.name}`;
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
  pickerA = wirePicker('a');
  pickerB = wirePicker('b');

  // On pose le fragment et on laisse `hashchange` faire le rendu :
  // un seul chemin d'entrée, que l'on arrive par le bouton ou par un lien reçu.
  el('go').addEventListener('click', () => {
    const a = pickerA.get();
    const b = pickerB.get();
    if (!a || !b) return;
    const hash = encodePair(a, b);
    if (location.hash === hash) showPair({a, b});
    else location.hash = hash;
  });

  // Une seule fois, pas à chaque changement de lieux : sinon les écouteurs s'empilent.
  addEventListener('resize', () => { state.lastMapPaint = 0; });

  el('copy').addEventListener('click', async () => {
    const url = el('share-url').value;
    try {
      await navigator.clipboard.writeText(url);
      flash('Lien copié');
    } catch {
      el('share-url').select();
      flash('Sélectionné, faites Ctrl+C');
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
  if (pair) showPair(pair);
  else showSetup();
}

// Exposé pour l'inspection manuelle en console pendant les tests.
window.SunriseCast = {SunCalc, subsolarPoint, nextSunset, nextSunrise, computeMoment, toPlace};

boot();
