# SunriseCast

**[app.taada.top/sunrisecast](https://app.taada.top/sunrisecast/)**

Le soleil qui se couche sur elle est le même qui se couchera sur vous.

Un coucher de soleil n'est pas un événement local. C'est une onde qui fait le tour de
la Terre à environ 1 670 km/h à l'équateur. Celui que quelqu'un regarde à Lisbonne
atteint Montréal 4 h 26 plus tard. Physiquement, c'est le même.

SunriseCast calcule ce délai entre deux endroits et montre la ligne voyager de l'un
vers l'autre.

## Aucun serveur, aucun compte, aucune donnée

Les deux lieux sont encodés dans le fragment de l'URL, la partie après le `#`. Un
fragment n'est jamais transmis au serveur, jamais journalisé, jamais mis en cache par
un intermédiaire.

Tout le calcul solaire tourne dans le navigateur. Il n'y a pas de base de données parce
qu'il n'y a rien à stocker : le lien que les deux personnes se partagent contient tout
l'état de l'application.

Conséquence : le site fonctionne hors ligne une fois chargé, ne coûte rien à héberger,
et il n'existe aucun compte à supprimer.

## Utilisation

Choisissez deux endroits, partagez le lien obtenu. La personne qui le reçoit n'installe
rien.

Sur mobile, « Ajouter à l'écran d'accueil » installe la page comme une application.

## Technique

Page statique, JavaScript natif, modules ES, aucune dépendance à l'exécution.

| Élément | Détail |
|---|---|
| Position solaire | [SunCalc](https://github.com/mourner/suncalc) v2, embarqué dans `src/vendor/` |
| Terminateur | Point subsolaire trouvé par deux recherches à une dimension sur l'API publique de SunCalc, puis forme fermée `tan(lat) = -cos(lng - lng₀) / tan(δ)` |
| Fond de carte | [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas`, converti hors ligne en contours simples |
| Projection | Équirectangulaire |

### Pourquoi une carte plate et pas un globe

Sur une sphère on ne voit qu'une moitié du monde. Deux personnes séparées de dix heures
sont presque aux antipodes : il serait impossible d'afficher les deux points en même
temps, ce qui est précisément ce que ce produit doit montrer.

## Développement

```bash
npm install
npm run serve     # http://127.0.0.1:8123
npm test          # 58 tests
```

Les fichiers générés se régénèrent :

```bash
npm run build:land   # src/data/land.js depuis world-atlas
npm run build:og     # og.png, l'aperçu des liens partagés
```

## Cas limites couverts

Les tests vérifient les endroits où ce genre de calcul casse habituellement : nuit et
jour polaires, où le coucher de soleil n'existe pas pendant des semaines ; les
équinoxes, où le terminateur devient vertical et passe par les pôles ; la ligne de
changement de date ; et les lieux dont le fuseau horaire est inconnu, pour lesquels
l'application refuse d'afficher une heure absolue plutôt que d'en inventer une
plausible.

Les heures sont confrontées à timeanddate.com : Lisbonne, 29 août 2026, coucher à
20:11 heure locale.

## Licence

MIT. SunCalc est sous licence BSD 2-Clause, voir `src/vendor/suncalc.LICENSE`.
Les données Natural Earth sont dans le domaine public.
