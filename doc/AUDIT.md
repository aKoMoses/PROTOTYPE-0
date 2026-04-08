# Audit technique et produit - Prototype-0

Date: 2026-04-08

## Objectif

Ce document liste les problemes observes dans l'application, les incoherences produit, et les ajouts prioritaires a prevoir hors gameplay pur.

L'objectif n'est pas de dire que le prototype est inutilisable. Au contraire, le build passe et la base de gameplay existe. Le probleme principal est que le projet compile alors que plusieurs couches sont trop melees: runtime, menu, shell, HUD, persistance, progression future et UI produit.

## Resume executif

- Le prototype est jouable, mais la structure actuelle ne separera pas proprement le gameplay, les menus et les futures pages produit.
- La boucle de jeu continue de tourner meme quand le prematch/menu est affiche.
- Plusieurs etats sont globaux et partages partout, ce qui rend les regressions probables a chaque ajout.
- Une partie de l'UI affiche deja des options non branchees a la logique.
- Le shell de navigation est trop rigide pour accueillir des pages comme Profil, Loadouts, Historique ou Collection.
- La documentation promet des directions produit utiles, mais l'application n'a pas encore les surfaces necessaires pour les rendre visibles.

## Constats verifies

### 1. La boucle de jeu tourne en permanence, meme menu ouvert

Constat:

- La boucle principale appelle tous les `update*()` a chaque frame dans `src/main.js`.
- `requestAnimationFrame(frame)` est relance sans condition.
- L'ouverture du prematch masque l'overlay mais ne suspend pas le runtime.

Preuves:

- `src/main.js`: la fonction `frame()` appelle `updatePlayer`, `updateEnemy`, `updateSurvivalEnemies`, `updateBullets`, `resolveCombat`, `updateDuelMatch`, `updateAudio`, `updateHud`, `drawWorld`, puis relance `requestAnimationFrame(frame)`.
- `src/build/ui.js`: `openPrematch()` passe `uiState.prematchOpen = true`, affiche l'overlay et nettoie quelques etats, mais ne desactive pas la boucle.
- `src/gameplay/player.js`: `updatePlayer()` continue a decrementer cooldowns, timers, flashs, status effects et plusieurs etats avant meme le test `combatLive`.

Impact:

- Le menu n'est pas un vrai etat de pause.
- Des etats de combat peuvent continuer a evoluer alors que le joueur pense etre sorti de l'action.
- Le projet n'a pas de point propre pour brancher un futur shell produit avec pages annexes.

Priorite: critique

### 2. Le shell de navigation n'est pas extensible

Constat:

- La navigation est codee en dur autour de trois vues: `landing`, `game`, `dev`.
- Il n'existe ni routeur interne, ni registre declaratif des pages, ni notion de modules d'ecran.

Preuves:

- `shell-ui.js`: `shellPanels` est un objet fixe avec `landing`, `game`, `dev`.
- `index.html`: les boutons et sections utilisent directement `data-shell-view="game"`, `data-shell-view="dev"` et les sections `shell-view-landing`, `shell-view-game`.

Impact:

- Ajouter des pages comme Profil, Loadouts, Historique, Collection ou Settings forcera a toucher le HTML central, le JS de shell et potentiellement des modules gameplay.
- Le shell agit comme une vitrine statique, pas comme une vraie structure d'application.

Priorite: haute

### 3. L'etat global est trop plat et trop partage

Constat:

- `src/state.js` concentre un grand nombre d'etats mutables: UI, loadout, bot build, combat, abilities, player, clone, training, etc.
- Tous les modules importent et modifient directement cet etat.

Preuves:

- `src/state.js`: melange `loadout`, `uiState`, `botBuildState`, `trainingToolState`, `player`, `playerClone`, `abilityState` et plusieurs collections runtime.
- `src/main.js`, `src/build/ui.js`, `src/gameplay/match.js`, `src/gameplay/input.js`, `src/session.js` lisent tous des morceaux de cet etat global.

Impact:

- Chaque nouvelle feature risque d'ajouter des conditions partout.
- Les bugs deviennent difficiles a isoler car la source de verite n'est pas cloisonnee.
- C'est une mauvaise base pour une app qui doit aussi avoir des pages hors gameplay.

Priorite: haute

### 4. L'UI contient deja des controles non branches a la logique

Constat:

- Le prematch expose des boutons de difficultes et de regles, mais ces controles n'ont pas de logique associee detectee dans le code.

Preuves:

- `index.html`: presence de `bot-difficulty-easy`, `bot-difficulty-normal`, `bot-difficulty-hard`, `bot-difficulty-nightmare`, ainsi que `rule-format-bo3`, `rule-format-bo5`, `rule-timer-*`, `rule-suddendeath-*`, `rule-mirror-*`.
- Recherche dans le workspace: ces identifiants apparaissent dans `index.html` mais pas dans la logique applicative.

Impact:

- L'utilisateur voit des options qui semblent exister alors qu'elles ne pilotent rien.
- Cela donne immediatement une impression de prototype incoherent ou trompeur.
- Ces faux points d'entree ralentissent les prochains devs, qui doivent d'abord separer le vrai du decoratif.

Priorite: haute

### 5. La doc produit et l'implementation ne sont pas encore alignees

Constat:

- La roadmap parle deja de progression, leaderboard, statistiques de build, ranked et meta-game.
- L'application n'a pas de surfaces dediees pour afficher ou gerer ces dimensions.

Preuves:

- `doc/EVOLUTIONS.md`: mentionne classement/leaderboard, statistiques de build, unlocks, ranked ELO, battle pass.
- `shell-ui.js` et `index.html`: aucune page dediee a ces sujets, uniquement `landing`, `game`, `dev`.

Impact:

- Le produit annonce une direction interessante, mais l'architecture de l'interface n'est pas encore prete pour l'assumer.
- Chaque ajout meta risque d'etre recolle dans le prematch au lieu d'avoir sa propre page.

Priorite: moyenne-haute

### 6. Il existe des traces de DOM/UI mortes ou incompletes

Constat:

- Certains noeuds DOM sont references et mis a jour cote JS sans qu'on retrouve leur presence dans le HTML principal.

Preuves:

- `src/dom.js`: references `selectedModeLabel`, `selectedMapLabel`, `selectedWeaponLabel`, `runePointsLabel`, `prematchDescription`.
- `src/build/ui.js`: ces elements sont renseignes dans `updatePrematchSummary()`.
- Recherche dans le workspace: ces identifiants ne ressortent pas dans `index.html`.

Impact:

- Le code transporte deja des morceaux d'interface fantomes.
- Cela complique la lecture et donne de faux indices sur l'etat reel du produit.

Priorite: moyenne

### 7. Le Build Lab et la documentation ne racontent pas exactement le meme produit

Constat:

- La documentation decrit un build complet tres riche, mais une partie de l'experience reste simplifiee ou partielle dans l'implementation actuelle.

Preuves:

- `doc/DOCUMENTATION.md`: presente les perks comme une categorie large du build.
- `src/build/ui.js`: la logique de build n'utilise qu'un seul slot de perk (`loadout.perks.slice(0, 1)`, `perk-0`).
- `src/dom.js`: un seul bouton `perk0` existe dans les slots de loadout.

Impact:

- Ce n'est pas forcement un bug, mais il faut clarifier si c'est un choix de scope temporaire ou un oubli.
- Sans clarification, l'audit produit et le balancing deviennent confus.

Priorite: moyenne

### 8. Le projet est trop centre sur une page unique gameplay

Constat:

- Le jeu, le prematch, les presets, les regles, les bots, les cosmiques et le shell cohabitent deja dans la meme page principale.

Preuves:

- `index.html`: la page `game` porte le canvas, le HUD, le prematch overlay, les presets, les regles de duel, la config bot et les controles audio.
- `src/dom.js`: le module centralise des dizaines de references issues de cette page unique.

Impact:

- Le prochain ajout non gameplay risque encore d'etre empile dans la meme surface.
- Le produit va perdre en lisibilite avant meme d'ajouter la progression ou la personnalisation profonde.

Priorite: haute

## Probleme racine

Le vrai probleme n'est pas seulement "il y a des bugs".

Le probleme racine est celui-ci:

- le projet n'a pas encore separe ses couches d'application.

Aujourd'hui, on voit au moins cinq couches entremelées:

- shell/navigation
- prematch/build lab
- gameplay runtime
- HUD/feedback
- persistance/session

Tant que ces couches ne sont pas mieux delimitees, chaque ajout va couter trop cher et introduire des regressions de comportement.

## Pages hors gameplay a ajouter

Ces ajouts doivent faire partie de l'audit, car ils obligent a corriger l'architecture avant de continuer a empiler du contenu dans la page de jeu.

### 1. Page Profil

Objectif:

- centraliser l'identite du joueur.

Doit contenir:

- nom ou tag joueur
- avatar selectionne
- badges/titres
- statistiques globales
- style de jeu prefere
- dernier loadout utilise

Pourquoi c'est important:

- c'est le point d'entree naturel pour sortir d'une logique purement "match instantane".
- cela donne une place propre a la personnalisation sans polluer le HUD de combat.

Priorite: tres haute

### 2. Page Loadouts

Objectif:

- gerer les builds comme des objets persistants et nommes.

Doit contenir:

- liste de loadouts sauvegardes
- creer/renommer/supprimer/dupliquer
- favori
- tags de style de jeu
- apercu du build
- import du build vers la session suivante

Pourquoi c'est important:

- les presets actuels sont utiles pour commencer, mais ils ne remplacent pas une vraie gestion de loadouts personnels.
- si tu veux que le jeu soit build-driven, il faut une surface dediee au build hors match.

Priorite: tres haute

### 3. Page Historique / Match Results

Objectif:

- sortir la lecture des performances du match lui-meme.

Doit contenir:

- resultat des derniers matchs
- map jouee
- build du joueur
- build adverse
- degats donnes/recus
- taux de victoire par build ou arme

Pourquoi c'est important:

- le joueur doit pouvoir comprendre ce qui fonctionne.
- cette page justifie ensuite les futures "statistiques de build" de la roadmap.

Priorite: haute

### 4. Page Collection / Unlocks

Objectif:

- rendre visible le contenu debloque ou a debloquer.

Doit contenir:

- armes
- abilities
- perks
- ultimates
- skins
- badges
- conditions de debloquage

Pourquoi c'est important:

- `doc/EVOLUTIONS.md` parle deja d'un meta-game.
- sans cette page, tout futur systeme d'unlock sera invisible ou recolle de force dans le prematch.

Priorite: moyenne-haute

### 5. Page Settings

Objectif:

- sortir les reglages utilitaires du flux de jeu.

Doit contenir:

- audio
- controles
- langue
- accessibilite
- performance/qualite visuelle

Pourquoi c'est important:

- l'audio est deja present dans le HUD de jeu, mais ce n'est pas sa meilleure place a terme.
- les reglages doivent etre accessibles sans lancer une session.

Priorite: moyenne-haute

### 6. Page Dev / Sandbox admin mieux separee

Objectif:

- garder les outils de debug et d'etat projet hors du produit joueur.

Constat actuel:

- `dev-status.html` existe deja.
- l'idee est bonne, mais il faut decider clairement si c'est une page dev interne ou une page visible produit.

Pourquoi c'est important:

- cela evitera de melanger besoin d'equipe et besoin du joueur final.

Priorite: moyenne

## Plan recommande

### Phase 1 - Stabiliser la structure

1. Introduire une vraie notion de `appView` ou `route`.
2. Sortir le gameplay runtime dans un etat "running / paused / hidden" explicite.
3. Faire en sorte que l'ouverture d'un menu ou d'une page hors gameplay suspende les updates gameplay non necessaires.
4. Isoler l'etat UI de l'etat combat.

### Phase 2 - Nettoyer le faux produit

1. Supprimer ou desactiver les controles non branches.
2. Retirer les references DOM fantomes.
3. Aligner la doc avec le scope reel actuel.

### Phase 3 - Ouvrir les premieres pages produit

1. Ajouter `Profil`.
2. Ajouter `Loadouts`.
3. Ajouter `Historique`.

### Phase 4 - Brancher la meta-game

1. Debloquages.
2. Collection.
3. Statistiques de build.
4. Leaderboard si le scope multiplayer avance vraiment.

## Ordre de priorite concret

Si je devais trier les prochains travaux par valeur et par risque:

1. Corriger la separation menu/game loop.
2. Introduire une navigation d'app plus propre que `landing/game/dev` code en dur.
3. Supprimer les options UI non branchees.
4. Ajouter une vraie page Loadouts.
5. Ajouter une vraie page Profil.
6. Ajouter Historique/Resultats.
7. Reporter ensuite seulement progression, unlocks et leaderboard.

## Conclusion

La base n'est pas vide: il y a deja un vrai prototype de combat, un build lab, une persistance de session et un shell minimal. Le probleme est que tout a commence a etre ajoute dans le meme espace applicatif.

Si on continue ainsi, chaque nouvelle feature va augmenter la confusion.

La bonne direction est donc:

- moins d'empilement dans `index.html`
- moins d'etat global partage partout
- moins de fausses options dans l'UI
- plus de vraies pages produit hors gameplay

Le meilleur premier ajout hors gameplay n'est pas un leaderboard ou un battle pass.

C'est un duo simple et utile:

- Profil
- Loadouts

Ces deux pages forceront naturellement le projet a mieux separer son architecture, et cette separation debloquera ensuite les autres features.