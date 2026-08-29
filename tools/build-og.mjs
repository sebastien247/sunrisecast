// Génère og.png (1200x630) : l'image d'aperçu utilisée par Open Graph / Twitter Card
// quand le lien SunriseCast est collé dans WhatsApp, iMessage, Discord ou Reddit.
//
// Compose une carte du monde en SVG à partir des VRAIES données de src/data/land.js
// et du VRAI calcul de terminateur de src/sun.js (mêmes fonctions que le rendu live
// dans src/map.js), puis rasterise en PNG avec @resvg/resvg-js. Cette dépendance est
// listée en devDependencies : elle ne s'exécute qu'ici, au moment de la génération,
// jamais dans le site publié.
//
// Régénérer : node tools/build-og.mjs

import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Resvg} from '@resvg/resvg-js';

import {LAND} from '../src/data/land.js';
import {subsolarPoint, terminatorLat} from '../src/sun.js';
import {project} from '../src/map.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'og.png');

const W = 1200;
const H = 630;

// Même palette que styles.css (:root). Dupliquée ici en constantes plutôt qu'importée :
// styles.css n'est pas un module JS.
const BG = '#0a0b14';
const INK = '#f6f1ea';
const INK_SOFT = 'rgba(246, 241, 234, 0.72)';
const INK_FAINT = 'rgba(246, 241, 234, 0.4)';
const SUN = '#ffb45c';
const COLOR_A = '#ffce7a';
const COLOR_B = '#8fd3ff';

// Même déroulement de l'antiméridien que traceLand() dans src/map.js (non exporté
// depuis là-bas, donc reproduit ici à l'identique sur les mêmes données LAND).
function unwrap(ring) {
  const out = [ring[0]];
  let prev = ring[0][0];
  let shift = 0;
  for (let i = 1; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    let d = lng + shift - prev;
    if (d > 180) shift -= 360;
    else if (d < -180) shift += 360;
    const adjusted = lng + shift;
    out.push([adjusted, lat]);
    prev = adjusted;
  }
  return out;
}

function landPathD() {
  const rings = LAND.map(unwrap);
  let d = '';
  for (const offset of [-360, 0, 360]) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [x, y] = project(ring[i][0] + offset, ring[i][1], W, H);
        d += (i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)} ` : `L${x.toFixed(2)},${y.toFixed(2)} `);
      }
      d += 'Z ';
    }
  }
  return d;
}

// Ligne du terminateur : même échantillonnage et même coupure de saut que
// drawTerminator() dans src/map.js, sur le vrai calcul de src/sun.js.
function terminatorPathD(sub) {
  const pts = [];
  for (let lng = -180; lng <= 180; lng += 0.5) {
    pts.push(project(lng, terminatorLat(lng, sub), W, H));
  }
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i > 0 && Math.abs(y - pts[i - 1][1]) > H * 0.55) d += `M${x.toFixed(2)},${y.toFixed(2)} `;
    else if (i === 0) d += `M${x.toFixed(2)},${y.toFixed(2)} `;
    else d += `L${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return d;
}

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Étiquette de lieu façon drawPin() : halo sombre puis texte clair, pour rester
// lisible qu'elle tombe sur la carte de jour ou de nuit.
function pinSvg(place, w, h, color) {
  const [x, y] = project(place.lng, place.lat, w, h);
  const label = escapeXml(place.name);
  const lx = x + 11;
  const ly = y - 9;
  return `
    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5.5" fill="rgba(10,10,16,0.85)"/>
    <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.6" fill="${color}"/>
    <text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
          font-size="16" font-weight="600" stroke="rgba(8,8,14,0.75)" stroke-width="3.5"
          stroke-linejoin="round" fill="none">${label}</text>
    <text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
          font-size="16" font-weight="600" fill="rgba(255,250,244,0.96)">${label}</text>`;
}

function buildSvg() {
  const now = new Date();
  const sub = subsolarPoint(now);

  // Lisbonne / Montréal : mêmes coordonnées que l'exemple vécu en production
  // (ops/COMPANY.md) et que le round-trip de test/link.test.js. Servent ici de
  // repères visuels, pas de placeholders inventés.
  const lisbon = {name: 'Lisbonne', lat: 38.72, lng: -9.14};
  const montreal = {name: 'Montréal', lat: 45.5, lng: -73.57};

  const land = landPathD();
  const terminator = terminatorPathD(sub);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glowTop" cx="50%" cy="-10%" r="75%">
      <stop offset="0%" stop-color="rgba(255,148,74,0.16)"/>
      <stop offset="62%" stop-color="rgba(255,148,74,0)"/>
    </radialGradient>
    <radialGradient id="glowCorner" cx="8%" cy="112%" r="70%">
      <stop offset="0%" stop-color="rgba(96,148,255,0.12)"/>
      <stop offset="60%" stop-color="rgba(96,148,255,0)"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(9,10,18,0)"/>
      <stop offset="38%" stop-color="rgba(9,10,18,0.55)"/>
      <stop offset="100%" stop-color="rgba(9,10,18,0.97)"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-200%" width="140%" height="500%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}"/>

  <path d="${land}" fill="#151829" fill-rule="evenodd" stroke="rgba(255,245,225,0.16)" stroke-width="0.8"/>

  <g stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="${terminator}" stroke="rgba(255,176,92,0.85)" stroke-width="3.2" filter="url(#glow)"/>
    <path d="${terminator}" stroke="rgba(255,246,230,0.9)" stroke-width="1.1"/>
  </g>

  ${pinSvg(lisbon, W, H, COLOR_A)}
  ${pinSvg(montreal, W, H, COLOR_B)}

  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#glowTop)"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#glowCorner)"/>
  <rect x="0" y="220" width="${W}" height="${H - 220}" fill="url(#scrim)"/>

  <text x="72" y="372" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
        font-size="20" font-weight="700" letter-spacing="4" fill="${SUN}">SUNRISECAST</text>

  <text x="72" y="434" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
        font-size="48" font-weight="650" fill="${INK}">Le soleil qui se couche sur elle</text>
  <text x="72" y="492" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
        font-size="48" font-weight="650" fill="${INK}">est le même qui se couchera sur vous.</text>

  <text x="72" y="540" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
        font-size="24" fill="${INK_SOFT}">Voyez la ligne dorée qui relie vos deux fuseaux, en direct.</text>

  <text x="${W - 72}" y="592" text-anchor="end" font-family="Segoe UI, ui-sans-serif, system-ui, sans-serif"
        font-size="17" fill="${INK_FAINT}">app.taada.top/sunrisecast</text>
</svg>`;
}

function main() {
  const svg = buildSvg();
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Segoe UI'
    },
    background: BG
  });
  const png = resvg.render().asPng();
  writeFileSync(OUT, png);

  // Vérification indépendante du convertisseur : on relit les octets bruts de l'en-tête
  // IHDR (largeur/hauteur en big-endian aux offsets 16 et 20) plutôt que de faire
  // confiance à l'absence d'erreur de resvg.
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  console.log(`og.png écrit : ${OUT}`);
  console.log(`Dimensions lues dans l'en-tête IHDR : ${width}x${height}`);
  if (width !== W || height !== H) {
    console.error(`ERREUR : dimensions attendues ${W}x${H}, obtenues ${width}x${height}`);
    process.exit(1);
  }
}

main();
