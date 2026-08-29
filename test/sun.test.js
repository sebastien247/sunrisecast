// Suite de tests pour src/sun.js.
//
// Toutes les valeurs de référence utilisées ici (déclinaisons, longitudes subsolaires,
// heures de lever/coucher) ont été obtenues en exécutant réellement le code du projet
// (node, ESM, `node --test`) — jamais devinées. Voir docs/qualite.md pour le détail des
// commandes utilisées et pour la liste des défauts trouvés en cours de route.
//
// Un test qui échoue ici parce que le code a un vrai défaut n'est jamais assoupli pour
// devenir vert : voir la section "BUG CONNU" plus bas, volontairement laissée rouge.

import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {subsolarPoint, altitudeAt, terminatorLat, nextSunset, nextSunrise} from '../src/sun.js';
import {getTimes} from '../src/vendor/suncalc.js';

const MAX_DECLINATION = 23.45; // obliquité de l'écliptique, borne physique
const MS_MIN = 60000;

describe('point subsolaire', () => {
  // 12 dates réparties sur l'année (le 15 de chaque mois 2026, midi UTC).
  const dates = Array.from({length: 12}, (_, m) => new Date(Date.UTC(2026, m, 15, 12, 0, 0)));

  for (const d of dates) {
    test(`déclinaison dans ±23,45° et altitude ≈ 90° au point subsolaire — ${d.toISOString().slice(0, 10)}`, () => {
      const sub = subsolarPoint(d);
      assert.ok(
        Math.abs(sub.lat) <= MAX_DECLINATION,
        `déclinaison ${sub.lat}° hors de ±${MAX_DECLINATION}°`
      );
      const alt = altitudeAt(sub.lat, sub.lng, sub);
      assert.ok(
        Math.abs(alt - 90) < 0.01,
        `altitude au point subsolaire = ${alt}°, attendu 90° ± 0,01°`
      );
    });
  }

  test('les solstices approchent les bornes ±23,45°', () => {
    const juin = subsolarPoint(new Date('2026-06-21T12:00:00Z'));
    const decembre = subsolarPoint(new Date('2026-12-21T12:00:00Z'));
    assert.ok(juin.lat > 23, `solstice de juin : déclinaison ${juin.lat}° trop faible`);
    assert.ok(decembre.lat < -23, `solstice de décembre : déclinaison ${decembre.lat}° trop faible`);
  });
});

describe('longitude subsolaire', () => {
  // À 12:00 UTC, la longitude subsolaire doit être proche de 0°. L'équation du temps
  // introduit un écart réel qui atteint ~4,1° début novembre et ~-3,6° mi-février
  // (vérifié en exécutant subsolarPoint sur ces dates : voir docs/qualite.md).
  // Tolérance choisie au-dessus de ce maximum réel pour ne jamais pénaliser un
  // comportement correct, tout en restant assez stricte pour attraper une vraie régression
  // (un décalage de fuseau complet, par exemple, produirait une erreur de plusieurs dizaines
  // de degrés, largement au-dessus de cette tolérance).
  const EOT_TOLERANCE_DEG = 4.5;

  const dates = [
    '2026-01-15T12:00:00Z',
    '2026-03-20T12:00:00Z',
    '2026-06-21T12:00:00Z',
    '2026-09-22T12:00:00Z',
    '2026-11-03T12:00:00Z', // proche du maximum réel de l'équation du temps (~+16 min)
    '2026-02-11T12:00:00Z'  // proche du minimum réel de l'équation du temps (~-14 min)
  ];

  for (const ds of dates) {
    test(`longitude subsolaire proche de 0° à 12:00 UTC — ${ds}`, () => {
      const sub = subsolarPoint(new Date(ds));
      assert.ok(
        Math.abs(sub.lng) < EOT_TOLERANCE_DEG,
        `longitude subsolaire ${sub.lng}° à 12:00 UTC, attendu < ${EOT_TOLERANCE_DEG}°`
      );
    });
  }

  test('la longitude subsolaire se décale d\'environ 15° par heure', () => {
    const base = new Date('2026-06-21T12:00:00Z');
    let prevLng = subsolarPoint(base).lng;
    for (let h = 1; h <= 3; h++) {
      const d = new Date(base.getTime() + h * 3600000);
      const lng = subsolarPoint(d).lng;
      const diff = lng - prevLng;
      assert.ok(
        Math.abs(diff - -15) < 0.5,
        `décalage horaire ${diff}°, attendu ≈ -15° (± 0,5°)`
      );
      prevLng = lng;
    }
  });
});

describe('terminateur', () => {
  // Autour des équinoxes, sub.lat (la déclinaison) frôle 0° et le terminateur devient
  // vertical (il passe par les pôles) : c'est le cas qui fait diviser par tan(dec)≈0 dans
  // terminatorLat. Le test explicite ces dates comme demandé.
  const equinoxDates = [
    '2026-03-20T00:00:00Z', '2026-03-20T12:00:00Z',
    '2026-03-21T00:00:00Z', '2026-03-21T12:00:00Z',
    '2026-09-22T00:00:00Z', '2026-09-22T12:00:00Z',
    '2026-09-23T00:00:00Z', '2026-09-23T12:00:00Z'
  ];
  const longitudes = [-180, -90, -45, 0, 45, 90, 179.9];

  for (const ds of equinoxDates) {
    test(`latitude du terminateur toujours finie autour de l'équinoxe — ${ds}`, () => {
      const sub = subsolarPoint(new Date(ds));
      for (const lng of longitudes) {
        const lat = terminatorLat(lng, sub);
        assert.ok(Number.isFinite(lat), `terminatorLat(${lng}, sub) = ${lat} (dec=${sub.lat}) n'est pas fini`);
      }
    });
  }

  test('en dehors des équinoxes, le terminateur correspond bien à une altitude nulle', () => {
    // Vérification croisée de la formule elle-même (pas seulement "pas NaN") : au solstice de
    // juin, tout point du terminateur doit avoir une altitude solaire ≈ 0°.
    const sub = subsolarPoint(new Date('2026-06-21T12:00:00Z'));
    for (const lng of [-150, -90, -30, 0, 30, 90, 150]) {
      const lat = terminatorLat(lng, sub);
      const alt = altitudeAt(lat, lng, sub);
      assert.ok(Math.abs(alt) < 1e-6, `altitude au terminateur = ${alt}° à lng=${lng}, attendu ≈ 0°`);
    }
  });
});

describe('nuit polaire — Tromsø au 21 décembre', () => {
  const TROMSO_LAT = 69.65;
  const TROMSO_LNG = 18.96;
  const date = new Date('2026-12-21T00:00:00Z');

  test('getTimes signale bien un jour sans coucher (alwaysDown)', () => {
    const t = getTimes(date, TROMSO_LAT, TROMSO_LNG);
    assert.equal(t.sunset, null, 'sunset devrait être null en nuit polaire');
    assert.equal(t.alwaysDown, true, 'alwaysDown devrait être vrai en nuit polaire');
  });

  test('nextSunset signale polar: "night" et renvoie un vrai coucher en janvier suivant', () => {
    const result = nextSunset(date, TROMSO_LAT, TROMSO_LNG);
    assert.equal(result.polar, 'night');
    assert.ok(result.at instanceof Date, 'un coucher réel devrait être trouvé');
    assert.ok(result.at > date, 'le coucher trouvé doit être postérieur à la date de départ');
    assert.equal(result.at.getUTCFullYear(), 2027, `année attendue 2027, obtenu ${result.at.getUTCFullYear()}`);
    assert.equal(result.at.getUTCMonth(), 0, `mois attendu janvier (0), obtenu ${result.at.getUTCMonth()}`);
  });
});

describe('jour polaire — Tromsø au 21 juin', () => {
  const TROMSO_LAT = 69.65;
  const TROMSO_LNG = 18.96;
  const date = new Date('2026-06-21T00:00:00Z');

  test('getTimes signale bien un jour sans coucher (alwaysUp)', () => {
    const t = getTimes(date, TROMSO_LAT, TROMSO_LNG);
    assert.equal(t.sunset, null, 'sunset devrait être null en jour polaire');
    assert.equal(t.alwaysUp, true, 'alwaysUp devrait être vrai en jour polaire');
  });

  test('nextSunset signale polar: "day"', () => {
    const result = nextSunset(date, TROMSO_LAT, TROMSO_LNG);
    assert.equal(result.polar, 'day');
    assert.ok(result.at instanceof Date, 'un coucher réel devrait être trouvé quand le jour polaire se termine');
    assert.ok(result.at > date);
  });
});

describe('ligne de changement de date — Suva et Apia', () => {
  const SUVA = {lat: -18.14, lng: 178.44};
  const APIA = {lat: -13.83, lng: -171.77};
  const from = new Date('2026-08-29T00:00:00Z');

  test('les deux couchers sont réels et cohérents à moins de 25h l\'un de l\'autre', () => {
    const suva = nextSunset(from, SUVA.lat, SUVA.lng);
    const apia = nextSunset(from, APIA.lat, APIA.lng);
    assert.ok(suva.at instanceof Date, 'coucher Suva introuvable');
    assert.ok(apia.at instanceof Date, 'coucher Apia introuvable');
    const diffHours = Math.abs(suva.at - apia.at) / 3600000;
    assert.ok(diffHours < 25, `écart de ${diffHours.toFixed(2)} h entre Suva et Apia, attendu < 25 h`);
  });
});

describe('valeur de référence externe — Lisbonne, 29 août 2026', () => {
  const LISBON_LAT = 38.72;
  const LISBON_LNG = -9.14;

  test('coucher à 19:11 UTC ± 2 minutes (confronté à timeanddate.com / time.bi)', () => {
    const t = getTimes(new Date('2026-08-29T00:00:00Z'), LISBON_LAT, LISBON_LNG);
    assert.ok(t.sunset instanceof Date, 'sunset ne devrait pas être null à cette latitude');
    const expected = new Date('2026-08-29T19:11:00Z');
    const diffMs = Math.abs(t.sunset - expected);
    assert.ok(
      diffMs < 2 * MS_MIN,
      `coucher calculé ${t.sunset.toISOString()}, attendu 19:11 UTC ± 2 min`
    );
  });
});

describe('BUG CONNU — longitude subsolaire hors de [-180, 180]', () => {
  // Constaté en exécutant subsolarPoint sur un balayage de la journée du 20 juin 2026 :
  // à 2026-06-20T00:00:00Z, subsolarPoint(date).lng vaut 180.378..., soit 0,38° au-delà
  // de la borne +180. Cause : argmax() (src/sun.js, la recherche dichotomique autour de
  // la ligne 30-39) ne clampe jamais x dans [lo, hi] pendant le raffinement ; comme la
  // fonction cherchée est périodique, f(x) reste mathématiquement valide même hors bornes,
  // donc rien ne force le résultat à revenir dans [-180, 180].
  // Impact réel aujourd'hui : nul pour le rendu (map.js n'utilise sub.lng que via
  // cos(lng - sub.lng), périodique), mais l'API publique window.SunriseCast.subsolarPoint
  // (src/app.js:369) peut renvoyer une longitude hors de la plage conventionnelle si un
  // futur usage l'affiche telle quelle. Voir docs/qualite.md pour la correction proposée.
  //
  // Ce test reste volontairement ROUGE : le défaut est réel, on ne l'a pas neutralisé.
  test('la longitude subsolaire devrait toujours rester dans [-180, 180]', () => {
    const sub = subsolarPoint(new Date('2026-06-20T00:00:00Z'));
    assert.ok(
      sub.lng >= -180 && sub.lng <= 180,
      `sub.lng = ${sub.lng}, hors de [-180, 180] — défaut réel, voir docs/qualite.md`
    );
  });
});
