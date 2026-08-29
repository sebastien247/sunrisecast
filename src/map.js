import {LAND} from './data/land.js';
import {altitudeAt, terminatorLat} from './sun.js';

// Projection équirectangulaire. Choisie contre le globe 3D pour une raison de fond :
// sur une sphère on ne voit qu'une moitié du monde, et deux personnes séparées de
// dix heures sont presque aux antipodes. On ne pourrait jamais afficher les deux
// en même temps, or c'est exactement ce que le produit doit montrer.
export const project = (lng, lat, w, h) => [((lng + 180) / 360) * w, ((90 - lat) / 180) * h];

// Palette du ciel en fonction de l'altitude du Soleil, en degrés.
// Les paliers suivent les crépuscules réels : civil (-6), nautique (-12), astronomique (-18).
//
// La clarté croît de façon monotone de la nuit vers le jour. Un vrai ciel s'assombrit
// au zénith, mais transposé sur une carte cela dessine un anneau clair autour d'un centre
// sombre : on lit un halo au lieu d'un côté jour. Le coucher de soleil reste identifiable
// par sa teinte chaude, pas par un pic de luminosité.
const SKY = [
  [-90, [5, 7, 18]],
  [-18, [10, 14, 34]],
  [-12, [22, 28, 60]],
  [-6, [58, 46, 100]],
  [-3, [116, 60, 104]],
  [-1, [190, 90, 86]],
  [0, [238, 126, 72]],
  [2, [250, 168, 96]],
  [6, [248, 208, 158]],
  [12, [212, 226, 236]],
  [30, [198, 220, 240]],
  [90, [192, 216, 242]]
];

function skyColor(alt) {
  if (alt <= SKY[0][0]) return SKY[0][1];
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i][0]) {
      const [a0, c0] = SKY[i - 1];
      const [a1, c1] = SKY[i];
      const t = (alt - a0) / (a1 - a0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return SKY[SKY.length - 1][1];
}

// Le dégradé est calculé sur une grille réduite puis étiré : à pleine résolution
// ce serait des centaines de milliers de points par image, pour un rendu identique
// puisque la lumière varie très lentement d'un pixel à l'autre.
const GRID_W = 480;
const GRID_H = 240;

let gridCanvas = null;

function paintSky(sub) {
  if (!gridCanvas) {
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = GRID_W;
    gridCanvas.height = GRID_H;
  }
  const ctx = gridCanvas.getContext('2d');
  const img = ctx.createImageData(GRID_W, GRID_H);
  const data = img.data;
  let i = 0;
  for (let y = 0; y < GRID_H; y++) {
    const lat = 90 - ((y + 0.5) / GRID_H) * 180;
    for (let x = 0; x < GRID_W; x++) {
      const lng = -180 + ((x + 0.5) / GRID_W) * 360;
      const c = skyColor(altitudeAt(lat, lng, sub));
      data[i++] = c[0];
      data[i++] = c[1];
      data[i++] = c[2];
      data[i++] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return gridCanvas;
}

// Les contours qui franchissent l'antiméridien reviendraient brutalement de +179 à -179
// et traceraient une barre horizontale en travers de la carte. On « déroule » donc les
// longitudes, puis on dessine la copie décalée de ±360° pour couvrir les deux bords.
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

let unwrapped = null;

function landRings() {
  if (!unwrapped) unwrapped = LAND.map(unwrap);
  return unwrapped;
}

function traceLand(ctx, w, h, offsetDeg) {
  ctx.beginPath();
  for (const ring of landRings()) {
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project(ring[i][0] + offsetDeg, ring[i][1], w, h);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
}

export function render(canvas, state) {
  const {sub, places, highlight} = state;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Ciel
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(paintSky(sub), 0, 0, w, h);

  // Terres : légèrement assombries pour se détacher de l'océan des deux côtés du terminateur,
  // avec un liseré côtier clair pour rester lisibles en pleine nuit.
  for (const offset of [-360, 0, 360]) {
    traceLand(ctx, w, h, offset);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fill('evenodd');
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(255, 245, 225, 0.22)';
    ctx.stroke();
  }

  drawGraticule(ctx, w, h);
  drawTerminator(ctx, w, h, sub);

  for (const p of places) {
    drawPin(ctx, w, h, p, highlight === p.key);
  }
}

function drawGraticule(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(0, lat, w, h);
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  for (let lng = -150; lng <= 150; lng += 30) {
    const [x] = project(lng, 0, w, h);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  ctx.stroke();
  // L'équateur un peu plus marqué que le reste.
  ctx.beginPath();
  const [, eq] = project(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.moveTo(0, eq);
  ctx.lineTo(w, eq);
  ctx.stroke();
  ctx.restore();
}

// La ligne du coucher de soleil elle-même. C'est l'objet central du produit,
// donc elle est tracée en dernier, en doré, avec une lueur.
function drawTerminator(ctx, w, h, sub) {
  const pts = [];
  for (let lng = -180; lng <= 180; lng += 0.5) {
    pts.push(project(lng, terminatorLat(lng, sub), w, h));
  }
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    // Aux équinoxes le terminateur devient vertical : un saut de latitude énorme
    // entre deux longitudes voisines est physique, pas une erreur, mais on coupe
    // le trait pour ne pas dessiner une diagonale qui n'existe pas.
    if (i > 0 && Math.abs(y - pts[i - 1][1]) > h * 0.55) ctx.moveTo(x, y);
    else if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.shadowColor = 'rgba(255, 176, 92, 0.85)';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(255, 208, 140, 0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 246, 230, 0.9)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

function drawPin(ctx, w, h, place, isHighlighted) {
  const [x, y] = project(place.lng, place.lat, w, h);
  ctx.save();

  if (isHighlighted) {
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 190, 120, 0.20)';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 10, 16, 0.85)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = place.color;
  ctx.shadowColor = place.color;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Étiquette repoussée vers l'intérieur quand le point est près d'un bord.
  const label = place.name;
  ctx.font = '600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  const tw = ctx.measureText(label).width;
  let lx = x + 11;
  let align = 'left';
  if (lx + tw > w - 6) {
    lx = x - 11;
    align = 'right';
  }
  const ly = y < 16 ? y + 16 : y - 9;
  ctx.textAlign = align;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(8, 8, 14, 0.75)';
  ctx.strokeText(label, lx, ly);
  ctx.fillStyle = 'rgba(255, 250, 244, 0.96)';
  ctx.fillText(label, lx, ly);
  ctx.restore();
}
