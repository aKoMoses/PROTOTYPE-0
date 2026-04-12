# Audit v3 — Correctifs, améliorations de l'existant et directions immédiates

Date : 2026-04-12

## Objectif

Le v2 listait les problèmes restants et proposait 18 chantiers. Depuis, plusieurs ont avancé : l'audio est en place (31 SFX + 4 musiques), l'IA a 4 paliers de difficulté fonctionnels, le contenu s'est enrichi (10 modules jouables, 18 implants, 5 ultimates).

Ce document fait trois choses :

1. **Lister les problèmes qui restent** — bugs, code mort, états incohérents, fonctionnalités débranchées.
2. **Proposer des améliorations concrètes de l'existant** — pas de refonte, pas de nouveau système, juste rendre ce qui existe plus solide.
3. **Proposer au maximum 2 features nouvelles** — les plus impactantes à court terme.

---

# PARTIE A — Problèmes actuels à corriger

---

## A1. Audit DOM à réaligner avec le code courant

Constat : la section DOM du v3 ne reflète plus l'état réel de la branche actuelle.

- `src/dom-lazy.js` n'existe plus dans le repo courant.
- `src/dom.js` n'exporte plus la grande liste d'éléments fantômes citée dans l'ancienne version de l'audit.
- `src/build/ui.js` ne rend plus de panel bot/règles via `renderTrainingBotPanel()` sur la branche actuelle.

Le problème réel a donc changé de nature : on n'est plus face à une double couche DOM (`dom.js` / `dom-lazy.js`) pleine de références mortes, mais face à une surface prematch simplifiée où certaines fonctionnalités ont été retirées du runtime sans que l'audit ait été recalé.

Impact : l'audit surestime aujourd'hui la dette DOM réelle et mélange des problèmes déjà supprimés du code avec des chantiers produit encore ouverts. Le document n'est donc plus une base fiable pour prioriser les travaux UI.

Correctif :
- purger de l'audit toutes les références à `src/dom-lazy.js` et aux anciens exports déjà retirés du runtime,
- reformuler A1 autour du vrai sujet courant : le prematch n'expose plus encore de panel de règles, de difficulté bot ni de détail enrichi,
- ne conserver dans l'audit que les références DOM encore réellement présentes dans la branche active.

Priorité : **haute** — le problème immédiat est d'abord un problème de vérité documentaire et de cadrage technique.

---

## A2. `matchSettings.timer` et `matchSettings.suddenDeath` — état déclaré mais toujours sans effet gameplay

Constat : `src/state/app-state.js` déclare :

```javascript
export const matchSettings = {
  format: "bo3",
  timer: 60,
  suddenDeath: true,
  mirror: false,
};
```

- `format` est utilisé dans `match.js` (lignes 241, 261) pour déterminer `formatWins`.
- `mirror` est lu dans `match.js` (ligne 561) pour copier le build joueur au bot.
- **`timer` n'est lu nulle part en gameplay.**
- **`suddenDeath` n'est lu nulle part en gameplay.**
- Contrairement à l'ancienne version de l'audit, les contrôles UI associés ne sont plus rendus par le code courant : le problème n'est plus "des boutons non branchés", mais un état applicatif présent sans manifestation UI ni effet en match.

Impact : le round n'a pas de limite de temps, le sudden death à 1-1 en BO3 n'est pas implémenté, et `matchSettings` embarque encore des champs qui suggèrent une feature disponible alors qu'elle reste purement déclarative.

Correctif : soit implémenter la logique timer/sudden death dans `updateDuelMatch()`, soit documenter ces champs comme « planifiés » et simplifier `matchSettings` tant que la mécanique n'existe pas réellement.

Priorité : **moyenne** — lié au A1, ces options ne sont pas encore visibles puisque le HTML manque.

---

## A3. `updateDetailPanel()` / `syncDetailPanelEnhancements()` — stubs vides à trancher

Constat : dans `src/build/ui.js`, les fonctions `updateDetailPanel()` et `syncDetailPanelEnhancements()` existent encore mais sont désormais vides.

```javascript
export function updateDetailPanel() {}

export function syncDetailPanelEnhancements() {}
```

L'ancienne description de "code mort après return" n'est donc plus vraie sur la branche actuelle : le refactor a déjà retiré le bloc inatteignable, mais a laissé les points d'entrée publics sans comportement.

Impact : ce n'est plus du dead code linéaire, c'est une API UI en pause. Le nom suggère un panel de détail enrichi encore vivant alors que la fonctionnalité n'est plus branchée.

Correctif :
- soit réimplémenter vraiment ces fonctions avec une surface HTML correspondante,
- soit supprimer ces stubs et leurs appels tant que le panel détaillé n'est pas réintroduit.

Priorité : **moyenne**

---

## A4. Incohérence de type sur `botBuildState.custom.implants`

Constat : dans `src/state/app-state.js` :

```javascript
// Ligne 44
custom: { ..., implants: "reactiveArmor", ... },
// Ligne 51
current: { ..., implants: "reactiveArmor", ... },
```

Partout ailleurs dans le codebase, `implants` est un **tableau** :
- `loadout.implants = ["scavengerPlates"]` (app-state.js ligne 8)
- `catalog.js` utilise `implants: ["reactiveArmor"]`
- `progression.js` : `INITIAL_UNLOCKS.implants = ["reactiveArmor", "dashCoolingLoop"]`
- `build/loadout.js` normalise déjà `loadoutConfig.implants` vers un perk unique puis reconstruit `implants` sous forme de tableau

Impact : le runtime principal compense aujourd'hui cette incohérence grâce à la normalisation dans `build/loadout.js`, mais l'état reste ambigu et fragile. Toute nouvelle logique qui itère directement sur `botBuildState.custom.implants` héritera d'une forme inattendue.

Correctif : changer les deux occurrences en `implants: ["reactiveArmor"]` pour la cohérence.

Priorité : **haute** — bug silencieux qui peut crasher à tout moment si du code itère sur ce champ.

---

## A5. Profil — données complètement mockées (toujours)

Constat : `src/pages/profile/profile-page.js` est toujours une IIFE avec des données en dur :

- `player.name = "SaA_BOT"`, `stats.wins = 47`, `stats.losses = 31` (lignes 9-22)
- 5 badges hardcodés (lignes 24-30)
- 10 entrées d'historique de match hardcodées (lignes 32-42)
- Aucun import de `progression.js`, `localStorage`, ou `session.js`

Le profil ne reflète rien de ce que le joueur fait réellement. Gagner 100 matchs = toujours 47 victoires affichées.

Impact : le profil est un mockup statique décoratif.

Correctif : détaillé en Partie B, section 1.

Priorité : **très haute**

---

## A6. Survie → aucun XP et aucun historique

Constat : `src/gameplay/survival.js` ne fait aucun appel à `addXp()`. Le mode Survie ne donne aucune progression.

- `startSurvivalRun()` (ligne 282) : pas d'XP.
- `finishSurvivalRun()` (ligne 314) : pas d'XP. Affiche un message de fin mais n'enregistre rien.
- `updateSurvivalMode()` : pas d'XP à aucun moment.

En comparaison, `updateDuelMatch()` dans `match.js` appelle `addXp(1, "duel-win")` quand le joueur gagne un match.

Impact : jouer 50 vagues de survie = 0 XP. Le mode survie n'alimente pas la progression.

Correctif : appeler `addXp()` dans `finishSurvivalRun()` avec un montant proportionnel aux vagues complétées (ex : `Math.floor(survivalState.wave / 2)` XP).

Priorité : **haute**

---

## A7. Progression XP sans borne haute

Constat : `sanitizeXp()` dans `src/progression.js` (ligne 50) fait `Math.max(0, ...)` sans maximum. Le calcul `getLevelForXp()` retourne `xp + 1` sans plafond.

- `LEVEL_UNLOCKS` s'arrête au niveau 13.
- Au-delà du niveau 13, aucun contenu ne se débloque.
- Un joueur avec 1000 XP affiche « Niveau 1001 » — absurde.

Impact : pas de crash, mais niveau visuellement incohérent après le cap de contenu.

Correctif : clamper le niveau *affiché* au `getMaxDefinedLevel()` + un petit buffer (ex : niveau max visible = 15 tant qu'il n'y a pas de contenu post-13).

Priorité : **basse**

---

## A8. `moduleState` conserve du state pour des capacités verrouillées

Constat : `src/state.js` (lignes 189-203) déclare des entrées de cooldown pour des modules qui sont `state: "locked"` dans `content.js` :

- `chainLightning` (locked)
- `blink` (locked)
- `phaseDash` (locked, avec un champ `time` en plus)
- `railShot` (locked)

Le fichier exporte aussi `abilityState = moduleState`, ce qui confirme qu'on est dans une phase de transition de nomenclature plutôt que dans un vrai nettoyage final du state.

Impact : pas de bug immédiat, mais du state réservé pour des fonctionnalités inexistantes. Ça augmente la surface de confusion pour quiconque lit `state.js` et entretient le flou entre ce qui est réellement jouable et ce qui reste seulement préparé.

Correctif : soit retirer ces entrées (et les recréer quand les modules seront implémentés), soit ajouter un commentaire `// reserved – locked module`.

Priorité : **basse**

---

## A9. Contrats d'exports ES modules fragiles pendant les renommages

Constat : le projet repose fortement sur des imports nommés entre fichiers gameplay (`audio.js`, `abilities.js`, `combat.js`, `enemy.js`, etc.). Lors d'un renommage ou d'une transition d'API, un alias supprimé peut casser tout le chargement du module au runtime avec une erreur du type :

```javascript
Uncaught SyntaxError: The requested module '/src/audio.js' does not provide an export named 'playAbilityCue'
```

Impact : contrairement à beaucoup d'autres régressions JS, celle-ci bloque le chargement du module entier avant même l'exécution du gameplay. Une simple suppression d'alias ou un renommage incomplet suffit à faire tomber toute la chaîne d'imports.

Correctif :
- conserver un alias de compatibilité pendant les transitions (`export const playAbilityCue = playModuleCue`),
- faire un sweep systématique des imports nommés après chaque renommage multi-fichiers,
- valider avec un vrai chargement navigateur, pas seulement un build.

Priorité : **haute** — faible coût de correction, fort impact runtime.

---

# PARTIE B — Améliorations de l'existant

---

## B1. Profil — brancher les vraies données

Le profil est la vitrine du joueur. Il doit refléter la réalité.

### B1a. Brancher la progression

- Importer `getProgressionSnapshot()` depuis `progression.js`.
- Afficher le vrai niveau et le vrai XP du joueur.
- Écouter `PROGRESSION_CHANGED_EVENT` pour mettre à jour en temps réel si le profil est ouvert.

### B1b. Implémenter un historique de matchs persistant

- À chaque fin de match duel (dans `updateDuelMatch()`, branche `match_end`) et fin de survie (dans `finishSurvivalRun()`), enregistrer dans `localStorage` :
  - Résultat (win/loss pour duel, vague atteinte pour survie)
  - Mode (duel/teamDuel/survival)
  - Map
  - Build joueur (arme + modules)
  - Score (X-Y pour duel, vague N pour survie)
  - Date
- Limiter à 50 dernières entrées (FIFO).
- Clé `localStorage` : `"p0-match-history-v1"`.

### B1c. Stats calculées

- À partir de l'historique : victoires, défaites, winstreak, meilleure vague survie.
- Affichées dans le profil à la place des données mockées.

### B1d. Avatar persisté

- Sauvegarder `player.avatar` dans `localStorage` au changement.
- Le relire à l'initialisation du profil.

Pourquoi : sans données réelles le profil est trompeur. Avec, il devient la preuve tangible que le joueur progresse.

Priorité : **très haute** — c'est le correctif qui a le plus d'impact visuel pour le joueur.

---

## B2. Survie → intégrer la progression

La survie est un mode complet mécaniquement (5 types d'ennemis, vagues adaptatives, scaling) mais il est déconnecté du reste du jeu.

### B2a. XP en survie

- `finishSurvivalRun()` doit appeler `addXp(amount, "survival")`.
- Formule suggérée : `Math.max(1, Math.floor(survivalState.wave / 2))` — soit 1 XP pour vague 1-3, 2 XP pour vague 4-5, etc.
- Capper à 5 XP par run pour ne pas déséquilibrer vs duel.

### B2b. Enregistrer le résultat en survie

- Ajouter une entrée à l'historique de matchs (cf. B1b) à la fin de chaque run.

Pourquoi : un mode de jeu qui ne récompense pas le joueur est un mode qu'on arrête après 2 essais.

Priorité : **haute**

---

## B3. Réintroduire proprement la config bot / règles de match

Le chantier n'est plus « HTML manquant uniquement ».

Sur la branche actuelle, la surface JS qui pilotait ces contrôles a déjà été en grande partie retirée du runtime. Il faudra donc réintroduire la tranche complète, pas seulement poser du markup dans `index.html`.

### B3a. Panel de configuration bot

Créer dans `index.html` (dans le `build-screen` ou en tant que section du prematch) les éléments :
- Carte `bot-config-card` avec titre, label, description
- Toggle difficulté : `bot-difficulty-easy`, `bot-difficulty-normal`, `bot-difficulty-hard`, `bot-difficulty-nightmare`
- Toggle mode bot : `bot-mode-random`, `bot-mode-custom`

### B3b. Panel de règles de match

- `match-rules-card` contenant :
  - Format : `rule-format-bo3`, `rule-format-bo5`
  - Timer : `rule-timer-off`, `rule-timer-60`, `rule-timer-75`
  - Sudden death : `rule-suddendeath-off`, `rule-suddendeath-on`
  - Mirror : `rule-mirror-off`, `rule-mirror-on`

### B3c. Rebrancher le runtime

- Réintroduire les refs DOM nécessaires dans `src/dom.js`.
- Ajouter les click handlers qui modifient `matchSettings` et `botBuildState.mode`.
- Restaurer ou réécrire le rendu prematch correspondant dans `src/build/ui.js`.
- La difficulté est déjà adaptive via `getCurrentBotDifficultyTier()` — mais il faudrait permettre un override manuel.

Pourquoi : ce n'est plus du front pur. C'est une tranche verticale UI + état + interaction à remettre en place proprement pour débloquer la customisation de match.

Priorité : **haute**

---

## B4. Corriger l'incohérence `botBuildState.custom.implants`

Changer `src/state/app-state.js` :

```javascript
// Ligne 44 & 51 : passer de string à tableau
implants: ["reactiveArmor"],  // au lieu de "reactiveArmor"
```

Vérifier tout le code qui lit `botBuildState.custom.implants` ou `botBuildState.current.implants` pour s'assurer qu'il traite un tableau.

Priorité : **haute** — correctif trivial, risque de crash si non traité.

---

## B5. Nettoyer `updateDetailPanel()` et `syncDetailPanelEnhancements()`

Deux options :
1. Si le panel détaillé doit revenir → réimplémenter les deux fonctions et remettre la surface `detail-*` dans l'HTML.
2. Si cette branche ne doit plus porter ce panel pour l'instant → supprimer les stubs et les points d'entrée publics associés.

Dans les deux cas, documenter la décision.

Priorité : **moyenne**

---

## B6. Timer de round et Sudden Death — implémenter la logique

Les valeurs `matchSettings.timer` et `matchSettings.suddenDeath` existent mais ne font rien.

### B6a. Timer de round

- Dans `updateDuelMatch()`, quand `matchState.phase === "active"`, décrémenter un `matchState.roundTimer` à chaque tick.
- Si le timer atteint 0 : le joueur avec le plus de HP gagne le round. Si HP égaux, round nul (point ennemi ou replay).
- Afficher le timer dans le HUD (dans la zone `match-score` ou en overlay sur le canvas).

### B6b. Sudden Death

- Si `matchSettings.suddenDeath === true` et que le score est 1-1 en BO3 (ou 2-2 en BO5), le round final commence avec les deux combattants à 50% HP.

Pourquoi : ces mécaniques ajoutent de la tension et de la variété sans nouveau contenu. Le state est déjà en place.

Priorité : **moyenne-haute**

---

# PARTIE C — Nouvelles features (max 2)

---

## C1. Historique de matchs persistant (feature neuve)

Ce n'est pas juste un correctif du profil — c'est la fondation nécessaire pour que le profil, les stats, et à terme les stats par loadout fonctionnent.

### Spec

- Créer un module `src/match-history.js` :
  - `recordMatchResult({ mode, map, result, score, build, date })` → ajoute au tableau dans `localStorage`.
  - `getMatchHistory()` → retourne les 50 dernières entrées.
  - `getMatchStats()` → retourne `{ wins, losses, matches, winstreak, bestSurvivalWave }`.
- Appeler `recordMatchResult()` depuis :
  - `updateDuelMatch()` à la branche `match_end`
  - `updateTeamDuelMatch()` à la branche `match_end`
  - `finishSurvivalRun()` à la fin de run
- Le profil lit `getMatchHistory()` et `getMatchStats()` au lieu des données mockées.

Pourquoi : c'est la pièce qui manque pour relier combat → profil → progression. Sans historique, le profil ne pourra jamais être réel. C'est le prérequis de B1 et B2.

Priorité : **critique** — tout le reste en dépend.

---

## C2. Sélecteur de difficulté joueur (feature neuve)

Actuellement la difficulté est 100% automatique : elle dépend du niveau de progression (`getBotDifficultyTierForLevel()`). Le joueur n'a aucun contrôle.

### Spec

- Ajouter un champ `matchSettings.difficultyOverride` (valeurs : `null | "easy" | "normal" | "hard" | "nightmare"`).
- `null` = comportement actuel (adaptatif basé sur le niveau).
- Toute autre valeur = override manuel.
- Modifier `getCurrentBotDifficultyTier()` dans `progression.js` :
  ```javascript
  export function getCurrentBotDifficultyTier() {
    if (matchSettings.difficultyOverride) return matchSettings.difficultyOverride;
    return getBotDifficultyTierForLevel(progressionState.level);
  }
  ```
- Afficher le sélecteur dans le prematch (cf. B3a pour le HTML).

Pourquoi : le joueur doit pouvoir choisir son challenge. Un débutant bloqué sur Normal n'a aucune raison de continuer. Un joueur avancé coincé en Easy s'ennuie. L'IA a 4 profils de difficulté implémentés et fonctionnels — il suffit de donner le choix.

Priorité : **haute**

---

# Inventaire du contenu au 2026-04-12

Pour référence, état actuel du contenu jouable vs verrouillé :

| Catégorie | Total | Jouable | Verrouillé |
|---|---|---|---|
| Armes | 8 | 8 | 0 |
| Modules (abilities) | ~29 | 10 | ~19 |
| Implants (perks) | ~21 | 18 | 3 |
| Cores (ultimates) | 6 | 5 | 1 |
| Maps duel | 2 | 2 | 0 |
| Maps training | 1 | 1 | 0 |

Audio : 31 SFX (ogg) + 4 musiques (mp3). Système audio Web Audio API complet avec 3 bus et persistence volume.

---

# Ordre de priorité recommandé

1. **C1. Historique de matchs** → fondation pour profil et stats. Sans ça, rien ne se branche.
2. **B1. Profil branché** → dépend de C1. Impact immédiat sur la perception joueur.
3. **A4. Fix type `implants`** → correctif trivial, prévient un crash futur.
4. **B2. XP en survie** → le mode survie alimente enfin la progression.
5. **B3. HTML config bot/règles** → débloque la customisation de match déjà codée côté JS.
6. **C2. Sélecteur de difficulté** → dépend de B3 pour l'UI, offre du contrôle joueur immédiat.
7. **B6. Timer de round + Sudden Death** → mécaniques de tension, état déjà en place.
8. **A3/B5. Nettoyer `syncDetailPanelEnhancements`** → hygiène de code.
9. **A1. Références DOM fantômes** → se résout progressivement avec B3 et les panels de détail.
10. **A9. Contrats d'exports ES modules** → correctifs de compatibilité à traiter immédiatement après chaque refactor multi-fichiers.
11. **A7/A8. XP cap + moduleState locked** → polish de bord, basse priorité.

---

## Conclusion

Le v2 identifiait 18 chantiers. Le projet a avancé sur plusieurs fronts : audio complet, IA avec difficulté graduée, contenu enrichi, matchmaking fonctionnel.

Le v3 constate que le **maillon faible est la boucle de feedback joueur** : le joueur combat, mais rien ne s'enregistre (pas d'historique), rien ne s'affiche (profil mockup), et le mode survie ne récompense pas.

Les deux features proposées (historique de matchs + sélecteur de difficulté) ne sont pas des ajouts cosmétiques — ce sont les deux pièces manquantes pour que l'existant fonctionne comme un tout cohérent.

L'architecture est prête. Le combat est solide. Il faut maintenant **fermer la boucle** : combat → enregistrement → profil → progression → choix → combat.
