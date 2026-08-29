// Suite de tests pour src/link.js.
//
// link.js utilise deux globaux navigateur en valeur par défaut de paramètre :
// `location.href` (buildUrl) et `location.hash` (decodePair). Sous Node, `location`
// n'existe pas du tout (vérifié : `typeof location === 'undefined'`), donc appeler ces
// fonctions SANS argument explicite lève une ReferenceError dès que le défaut est évalué.
// On ne simule pas un faux `location` pour forcer un test vert : cela testerait un
// environnement qui n'est pas Node et masquerait le vrai comportement. À la place, ce
// fichier vérifie explicitement — et documente — cette limite avec {skip: ...}.
// Voir docs/qualite.md pour le détail.

import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import {encodePair, decodePair, buildUrl} from '../src/link.js';

describe('aller-retour encodage / décodage', () => {
  test('paire simple : tous les champs survivent', () => {
    const a = {name: 'Lisbonne', country: 'Portugal', lat: 38.72, lng: -9.14, tz: 'Europe/Lisbon'};
    const b = {name: 'Montréal', country: 'Canada', lat: 45.5, lng: -73.57, tz: 'America/Toronto'};
    const hash = encodePair(a, b);
    const decoded = decodePair(hash);
    assert.ok(decoded, 'le décodage ne devrait pas échouer');
    assert.deepEqual(decoded.a, a);
    assert.deepEqual(decoded.b, b);
  });

  test('accents et apostrophes dans les noms de villes survivent au round-trip', () => {
    const a = {name: 'Montréal', country: 'Québec', lat: 45.5, lng: -73.57, tz: 'America/Toronto'};
    const b = {name: "Val-d'Or", country: "Côte-d'Ivoire", lat: 48.1, lng: -77.78, tz: 'America/Toronto'};
    const hash = encodePair(a, b);
    const decoded = decodePair(hash);
    assert.equal(decoded.a.name, 'Montréal');
    assert.equal(decoded.a.country, 'Québec');
    assert.equal(decoded.b.name, "Val-d'Or");
    assert.equal(decoded.b.country, "Côte-d'Ivoire");
  });

  test('buildUrl avec une base explicite produit une URL décodable', () => {
    const a = {name: 'Lisbonne', country: 'Portugal', lat: 38.72, lng: -9.14, tz: 'Europe/Lisbon'};
    const b = {name: 'Montréal', country: 'Canada', lat: 45.5, lng: -73.57, tz: 'America/Toronto'};
    const url = buildUrl(a, b, 'https://sunrisecast.example/app');
    assert.ok(url.startsWith('https://sunrisecast.example/app#'));
    const hash = '#' + url.split('#')[1];
    const decoded = decodePair(hash);
    assert.deepEqual(decoded.a, a);
    assert.deepEqual(decoded.b, b);
  });
});

describe('rejet des coordonnées hors plage', () => {
  const good = 'X|Y|10|10|Europe/Lisbon';

  test('latitude > 90 rejetée', () => {
    assert.equal(decodePair(`#a=X|Y|90.0001|10|Europe/Lisbon&b=${good}`), null);
  });
  test('latitude < -90 rejetée', () => {
    assert.equal(decodePair(`#a=X|Y|-90.0001|10|Europe/Lisbon&b=${good}`), null);
  });
  test('longitude > 180 rejetée', () => {
    assert.equal(decodePair(`#a=X|Y|10|180.0001|Europe/Lisbon&b=${good}`), null);
  });
  test('longitude < -180 rejetée', () => {
    assert.equal(decodePair(`#a=X|Y|10|-180.0001|Europe/Lisbon&b=${good}`), null);
  });
  test('latitude non numérique rejetée', () => {
    assert.equal(decodePair(`#a=X|Y|abc|10|Europe/Lisbon&b=${good}`), null);
  });

  test('les bornes exactes ±90 / ±180 sont acceptées', () => {
    const d1 = decodePair(`#a=X|Y|-90|10|Europe/Lisbon&b=${good}`);
    assert.equal(d1.a.lat, -90);
    const d2 = decodePair(`#a=X|Y|90|10|Europe/Lisbon&b=${good}`);
    assert.equal(d2.a.lat, 90);
    const d3 = decodePair(`#a=X|Y|10|-180|Europe/Lisbon&b=${good}`);
    assert.equal(d3.a.lng, -180);
    const d4 = decodePair(`#a=X|Y|10|180|Europe/Lisbon&b=${good}`);
    assert.equal(d4.a.lng, 180);
  });
});

describe('fragment vide ou tronqué', () => {
  test('chaîne vide', () => {
    assert.equal(decodePair(''), null);
  });
  test('juste un dièse', () => {
    assert.equal(decodePair('#'), null);
  });
  test('un seul lieu (b manquant)', () => {
    assert.equal(decodePair('#a=Lisbonne|Portugal|38.72|-9.14|Europe/Lisbon'), null);
  });
  test('lieu tronqué : longitude manquante (moins de 4 champs)', () => {
    assert.equal(
      decodePair('#a=Lisbonne|Portugal|38.72&b=X|Y|10|10|Europe/Lisbon'),
      null
    );
  });
  test('lieu tronqué : seul le nom présent', () => {
    assert.equal(
      decodePair('#a=Lisbonne&b=X|Y|10|10|Europe/Lisbon'),
      null
    );
  });
});

describe('fuseau IANA invalide ou absent', () => {
  test('fuseau invalide : ne fait pas planter, tz devient null', () => {
    const decoded = decodePair('#a=X|Y|10|10|Pas/UnFuseau&b=X|Y|10|10|Europe/Lisbon');
    assert.ok(decoded);
    assert.equal(decoded.a.tz, null);
  });
  test('fuseau absent (champ non fourni, 4 segments seulement) : tz devient null', () => {
    const decoded = decodePair('#a=X|Y|10|10&b=X|Y|10|10|Europe/Lisbon');
    assert.ok(decoded);
    assert.equal(decoded.a.tz, null);
  });
  test('fuseau absent mais présent en tant que champ vide (5 segments) : tz devient null', () => {
    const decoded = decodePair('#a=X|Y|10|10|&b=X|Y|10|10|Europe/Lisbon');
    assert.ok(decoded);
    assert.equal(decoded.a.tz, null);
  });
});

describe('noms de lieu vides ou trop longs', () => {
  test('nom vide retombe sur "Sans nom"', () => {
    const decoded = decodePair('#a=|Portugal|38.72|-9.14|Europe/Lisbon&b=X|Y|10|10|Europe/Lisbon');
    assert.equal(decoded.a.name, 'Sans nom');
  });
  test('nom de plus de 60 caractères est tronqué', () => {
    const longName = 'A'.repeat(80);
    const a = {name: longName, country: 'X', lat: 1, lng: 1, tz: null};
    const hash = encodePair(a, {name: 'X', country: 'Y', lat: 1, lng: 1, tz: null});
    const decoded = decodePair(hash);
    assert.equal(decoded.a.name.length, 60);
  });
});

describe('dépendance au navigateur — non testable sous Node sans navigateur', () => {
  // Vérifié : `typeof location === 'undefined'` sous Node 22. buildUrl(a, b) sans 3e
  // argument et decodePair() sans argument évaluent leur valeur par défaut
  // (`location.href` / `location.hash`) et lèvent donc une ReferenceError — confirmé en
  // exécutant le code réel, pas déduit du nom des paramètres.
  const a = {name: 'X', country: 'Y', lat: 1, lng: 1, tz: null};
  const b = {name: 'X', country: 'Y', lat: 1, lng: 1, tz: null};

  test('buildUrl(a, b) sans base explicite lève sous Node (comportement réel, non un défaut)', () => {
    assert.throws(() => buildUrl(a, b), ReferenceError);
  });

  test('decodePair() sans argument lève sous Node (comportement réel, non un défaut)', () => {
    assert.throws(() => decodePair(), ReferenceError);
  });

  test('comportement réel dans un navigateur : non vérifiable ici', {skip: 'nécessite un vrai `location` de navigateur (jsdom ou navigateur headless non installés) — voir docs/qualite.md'}, () => {});
});
