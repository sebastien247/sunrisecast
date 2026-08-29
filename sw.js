// Service worker de cache applicatif.
//
// Tout le calcul de SunriseCast est local (SunCalc vendoré, aucun appel réseau),
// donc une fois les fichiers statiques en cache, la page doit s'ouvrir et afficher
// le compte à rebours même sans connexion. Stratégie cache-first : on sert depuis
// le cache si on l'a, sinon on va au réseau et on range ce qu'on reçoit au passage.
//
// CACHE_VERSION change à chaque déploiement qui modifie un fichier mis en cache :
// c'est ce qui purge l'ancien cache dans `activate`. Oublier de le monter fait
// vivre une version périmée indéfiniment chez les visiteurs revenus hors ligne.
//
// v2 (2026-08-29) : passage du site en bilingue fr/en (index.html, app.js, link.js,
// cities.js, styles.css tous modifiés). Constaté en le vérifiant en production : un
// visiteur ayant déjà le service worker v1 installé restait bloqué sur l'ancien site
// francophone-seul indéfiniment sans ce bump, puisque sw.js lui-même n'a pas changé de
// contenu et ne déclenche donc jamais de réinstallation.
//
// v3 (2026-08-30) : aperçu Open Graph figé en anglais (index.html) et noms de ville
// relocalisés à la lecture du lien (app.js, link.js). Ces trois fichiers sont dans
// ASSET_PATHS ci-dessous : sans ce bump, un visiteur avec le service worker v2 déjà
// installé continuerait de servir l'ancien app.js/link.js depuis son cache local.
const CACHE_VERSION = 'sunrisecast-v3';

// Chemins relatifs à la portée du service worker (le dossier où vit sw.js),
// pas à la racine du domaine : ça laisse le site fonctionner posé dans un
// sous-dossier d'un hébergement statique quelconque.
const ASSET_PATHS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/app.js',
  './src/sun.js',
  './src/map.js',
  './src/link.js',
  './src/data/cities.js',
  './src/data/land.js',
  './src/vendor/suncalc.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Un fichier par un fichier plutôt que cache.addAll : un seul 404 ne doit pas
    // empêcher l'installation de tout le reste (addAll échoue en bloc au premier raté).
    await Promise.all(ASSET_PATHS.map(async (path) => {
      try {
        const url = new URL(path, self.registration.scope).toString();
        const res = await fetch(url, {cache: 'reload'});
        if (res.ok) await cache.put(url, res);
      } catch {
        // Hors ligne dès l'installation, ou fichier absent : tant pis pour celui-là,
        // le fetch-fallback du gestionnaire `fetch` prendra le relais plus tard.
      }
    }));
    // Active la nouvelle version tout de suite plutôt que d'attendre la fermeture
    // de tous les onglets ouverts sur l'ancienne.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Rien de tiers à intercepter : suncalc et les données géographiques sont
  // vendorées dans src/. On ne gère que le même-origine, le reste suit son cours normal.
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // Mise en cache opportuniste : un fichier statique du même dossier qui n'était
      // pas dans ASSET_PATHS au moment de l'installation finit quand même par y entrer.
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      // Hors ligne et rien en cache pour cette requête précise. Pour une navigation
      // (l'utilisateur ouvre ou recharge la page), on retombe sur index.html : c'est
      // une application à page unique, le routage se fait ensuite par le fragment d'URL
      // déjà présent dans la barre d'adresse, sans nouvelle requête réseau.
      if (req.mode === 'navigate') {
        const fallback = await caches.match(new URL('./index.html', self.registration.scope).toString());
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
