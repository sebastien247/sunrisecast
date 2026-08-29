// Régénère src/data/land.js depuis world-atlas.
//
// La donnée source est Natural Earth (domaine public), servie par le paquet
// world-atlas au format TopoJSON. On la convertit une fois pour toutes en contours
// simples afin que le site n'embarque aucun décodeur TopoJSON à l'exécution.
//
//   node tools/build-land.mjs
//
// Dépendances de développement uniquement. Le site publié ne charge que le fichier
// généré.

import {readFileSync, writeFileSync} from 'node:fs';
import {feature} from 'topojson-client';

const SOURCE = 'node_modules/world-atlas/land-110m.json';
const TARGET = 'src/data/land.js';

const topo = JSON.parse(readFileSync(SOURCE, 'utf8'));
const geo = feature(topo, topo.objects.land);

const rings = [];
const push = (polygon) => {
  for (const ring of polygon) {
    // Le centième de degré vaut environ un kilomètre : bien en deçà de ce qu'un
    // contour à 1:110 000 000 peut résoudre, et divise le poids du fichier.
    rings.push(ring.map(([lng, lat]) => [Math.round(lng * 100) / 100, Math.round(lat * 100) / 100]));
  }
};

for (const f of geo.features) {
  const g = f.geometry;
  if (g.type === 'Polygon') push(g.coordinates);
  else if (g.type === 'MultiPolygon') for (const p of g.coordinates) push(p);
}

// Un anneau de moins de 4 points ne peut pas se refermer en surface.
const kept = rings.filter((r) => r.length >= 4);

writeFileSync(
  TARGET,
  `// Généré par tools/build-land.mjs depuis world-atlas/land-110m.json (Natural Earth, domaine public).\n` +
  `// Ne pas modifier à la main : relancer \`node tools/build-land.mjs\`.\n` +
  `// Contours terrestres [lng, lat], arrondis au centième de degré.\n` +
  `export const LAND = ${JSON.stringify(kept)};\n`
);

const points = kept.reduce((n, r) => n + r.length, 0);
console.log(`${TARGET} : ${kept.length} contours, ${points} points`);
