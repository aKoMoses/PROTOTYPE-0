# Audit v2 — Idées d'améliorations et correctifs

Date: 2026-04-09

## Objectif

Le v1 a diagnostiqué les problèmes structurels. Plusieurs ont été corrigés : le shell est extensible, les pages Profil / Loadouts / Collection existent, la boucle de jeu se pause proprement.

Ce document fait deux choses :

1. **Lister les problèmes qui restent** — bugs, code mort, contrôles non branchés, données fantômes.
2. **Proposer des améliorations concrètes** — nouvelles features, extensions de l'existant, directions produit.

---

# PARTIE A — Problèmes actuels à corriger

---

## A1. Boutons de difficulté et règles toujours non branchés

Constat : les boutons `bot-difficulty-easy/normal/hard/nightmare`, `rule-format-bo3/bo5`, `rule-timer-*`, `rule-suddendeath-*`, `rule-mirror-*` sont dans `index.html` (lignes 458-479) avec des classes `toggle-chip` et des états `is-active`.

Problème : aucun event listener n'est attaché à ces boutons dans le code JS. Ils ne changent aucun état, ne modifient aucun paramètre de match. Le joueur clique dessus, rien ne se passe.

Preuve : recherche de `bot-difficulty-easy`, `rule-format-bo3`, `rule-timer`, `rule-suddendeath`, `rule-mirror` dans tous les fichiers `.js` → aucun résultat.

Impact : le joueur voit des options de difficulté et de règles qui ne font rien. C'est trompeur.

Correctif : soit brancher ces boutons à la logique de match (modifier `matchState.formatWins`, ajouter un timer, appliquer un profil de difficulté au bot), soit les retirer du HTML tant qu'ils ne sont pas fonctionnels.

Priorité : haute

---

## A2. Références DOM fantômes dans `src/dom.js`

Constat : `src/dom.js` exporte des références vers des éléments qui n'existent pas dans `index.html`.

Éléments fantômes confirmés :

- `selectedModeLabel` → `id="selected-mode-label"` absent du HTML
- `selectedMapLabel` → `id="selected-map-label"` absent du HTML
- `selectedWeaponLabel` → `id="selected-weapon-label"` absent du HTML
- `prematchDescription` → `id="prematch-description"` absent du HTML

Impact : ces exports valent `null`. Le code qui les utilise dans `src/build/ui.js` (`updatePrematchSummary()`) fait des assignments sur `null` sans crash (simple no-op) mais c'est du code mort qui donne de faux indices sur l'état du produit.

Correctif : supprimer ces exports de `dom.js` et les usages associés dans `ui.js`.

Priorité : moyenne

---

## A3. `syncDetailPanelEnhancements()` — code mort après `return`

Constat : dans `src/build/ui.js` (ligne 754), la fonction `syncDetailPanelEnhancements()` appelle `updateDetailActions()` puis fait un `return` immédiat. Tout le code qui suit (~30 lignes) est inatteignable.

```javascript
export function syncDetailPanelEnhancements() {
  updateDetailActions();
  return;  // ← tout ce qui suit est mort
  const detail = uiState.selectedDetail ?? ...
  // ... 30 lignes de code mort
}
```

Impact : code inutile qui pollue la lecture. Soit ce code devait exécuter (et le `return` est un bug), soit c'est un reste de refacto et il faut supprimer le code mort.

Correctif : déterminer si le code après le `return` est voulu (alors retirer le `return`) ou obsolète (alors supprimer le code mort).

Priorité : moyenne

---

## A4. Profil — données complètement mockées

Constat : `profile.js` affiche un profil avec des données statiques écrites en dur :

- Nom : `"SaA_BOT"` (ligne 8)
- Titre : `"Champion de la Casse"` (ligne 9)
- Stats : `wins: 47, losses: 31, matches: 78, winstreak: 5` (lignes 14-18)
- 5 badges avec statuts d'unlock fixes (lignes 20-26)
- 10 entrées d'historique de match statiques (lignes 28-39)

Problème : rien n'est connecté aux vraies données. Le joueur peut gagner 100 matchs, son profil affichera toujours 47 victoires.

Preuve : aucun import de `progression.js`, `session.js` ou `localStorage` dans `profile.js`. La fonction `initProfile()` n'écoute pas `PROGRESSION_CHANGED_EVENT`.

Impact : le profil est un mockup. Il donne l'impression d'être fonctionnel mais ne reflète aucune vraie donnée joueur.

Correctif : brancher les vraies données — détaillé dans la Partie B, section 1.

Priorité : haute

---

## A5. Avatar non persisté

Constat : le sélecteur d'avatar dans le profil (`profile.js` lignes 410-423) fonctionne visuellement — cliquer un avatar change l'affichage — mais la sélection est stockée uniquement dans la variable locale `player.avatar` et n'est jamais écrite dans `localStorage`.

Impact : fermer l'onglet ou recharger la page = retour à l'avatar par défaut (index 0).

Correctif : sauvegarder `player.avatar` dans `localStorage` au changement, le relire à l'initialisation.

Priorité : basse

---

## A6. Progression XP sans borne haute

Constat : `sanitizeXp()` dans `src/progression.js` (ligne 42) fait `Math.max(0, ...)` mais jamais de `Math.min(max, ...)`. Le calcul de niveau est `level = xp + 1`, sans plafond.

Problème : si on appelle `setXp(1000, "test")`, on obtient un niveau 1001. Les unlocks s'arrêtent au niveau 13. Au-delà, aucune entrée dans `LEVEL_UNLOCKS`, donc le joueur est à un niveau élevé sans aucune récompense associée.

Impact : pas de crash, mais un niveau affiché absurdement élevé sans signification. En production, pas critique. En test, c'est confusant.

Correctif : soit clamper le niveau visuel au max connu (`getMaxDefinedLevel()`), soit ajouter du contenu après le niveau 13 (voir Partie B, section 8).

Priorité : basse

---

# PARTIE B — Améliorations et nouvelles features

---

## 1. Profil — brancher les vraies données

Constat : la page Profil est en place mais affiche des données mockées en dur dans `profile.js`.

Propositions :

- Connecter le profil à `progression.js` pour afficher le vrai niveau et le vrai XP.
- Stocker les stats de match (victoires, défaites, winstreak) dans `localStorage` et les lire depuis le profil.
- Enregistrer les résultats de chaque match dans un historique persistant (tableau JSON dans `localStorage`), et l'afficher dans le journal de combat.
- Sauvegarder le choix d'avatar dans `localStorage` pour qu'il survive entre les sessions.
- Afficher le loadout le plus joué et son winrate.

Pourquoi : sans données réelles le profil est décoratif. Avec, il devient la preuve que le joueur progresse.

Priorité : très haute

---

## 2. IA — niveaux de difficulté et personnalités           

Constat : les bots ont un comportement par arme (`getEnemyBehaviorProfile`) mais pas de vraie graduation de difficulté. Tous les bots jouent pareil quel que soit le contexte.

### 2a. Implémenter Easy / Normal / Hard / Nightmare

- Easy : temps de réaction plus lent (~400ms de délai avant tir), moins de dodge, pas d'usage abilities.
- Normal : baseline actuelle.
- Hard : réaction rapide, utilise les abilities (shield, grapple défensif), dodge fréquent.
- Nightmare : optimise ses timings, utilise combo javelin → arme, gère les cooldowns, utilise son ultime.

### 2b. Personnalités de bot

Chaque arme a déjà un profil, mais on peut aller plus loin :

- **Sniper Patient** : reste loin, charge ses tirs, se téléporte aux portails pour fuir.
- **Axe Rusher** : rush en dash, engage au corps-à-corps, utilise stun finisher.
- **Support Zoner** : pose champ magnétique, contrôle le heal pack, joue le temps.
- **Burst Assassin** : javelin → dash derrière → shotgun, cherche le one-shot.

### 2c. Adaptation au joueur

- Le bot observe le style du joueur (ratio agressif/défensif, habitudes de dash, zone de jeu préférée).
- Sur Hard+, il ajuste son spacing et sa fréquence de dodge en fonction.

Pourquoi : l'IA est le seul adversaire. Si elle ne varie pas, le jeu meurt après 10 matchs.

Priorité : critique

---

## 3. Contenu — débloquer les 19 abilities verrouillées

Constat : `content.js` définit 28 abilities mais seulement 9 sont jouables. 19 sont à `state: "locked"` : blinkStep, jetLeap, slideBooster, phaseDash, chainLightning, plasmaCone, returningBlade, magneticMine, delayedOrb, shortLaser, scatterBlast, autoTurret, fragmentGrenade, hologramDecoy, speedSurge, railShot, cooldownReset, visionScan…

Propositions :

- Implémenter les abilities les plus impactantes d'abord : **hologramDecoy** (leurre), **autoTurret** (zone control), **fragmentGrenade** (AoE burst), **speedSurge** (haste pure).
- Ajouter ces abilities dans la progression (LEVEL_UNLOCKS) pour que les niveaux post-13 aient du sens.
- Viser 15 abilities jouables à court terme, 20+ à moyen terme.

Pourquoi : avec 9 abilities jouables et 3 slots, le nombre de builds viables est trop faible. Il faut du volume pour qu'un système « build-driven » fonctionne.

Priorité : très haute

---

## 4. Perks — passer à 2 ou 3 slots

Constat : le build n'utilise qu'1 slot de perk. 8 perks existent, mais vu la limitation à 1 slot, la couche perk est presque invisible.

Propositions :

- Passer à 2 slots de perk minimum.
- Introduire des synergies entre perks : par exemple, combiner `dashCooling` + `omnivampCore` donne une identité « hit-and-run » lisible.
- Créer des incompatibilités : certains perks ne se combinent pas (ex. `reactiveArmor` + `lastStandBuffer` serait trop défensif).
- Ajouter 4-5 nouveaux perks qui ciblent des archétypes manquants : perk de zoning, perk de burst, perk lié aux status effects.

Pourquoi : les perks sont le sel du build. Un slot unique rend les choix trop simples.

Priorité : haute

---

## 5. Ultimates — compléter les stubs

Constat : 3 ultimates fonctionnent (phantomSplit, revivalProtocol, empCataclysm). 2 sont listés playable mais stub (arenaLockdown, berserkCore).

Propositions :

- **Arena Lockdown** : zone circulaire qui rétrécit l'arène pendant 4s, forçant le combat rapproché.
- **Berserk Core** : boost de dégâts +40% et vitesse +20% pendant 3s, mais le joueur ne peut pas dasher.
- **Nouvel ultime — Overclock** : reset tous les cooldowns abilities instantanément + 2s d'invulnérabilité.

Pourquoi : 3 ultimes sur 5+ loadout builds possibles = trop peu de diversité en fin de build.

Priorité : haute

---

## 6. Maps — plus de variété et de features interactives

Constat : 2 maps de duel (Electro Gallery, Bric-a-Broc) + 1 sandbox. Les deux maps ont des layouts similaires.

### 6a. Nouvelles maps

- **Forge Pit** : map petite et fermée, 2400×1400, pas de portails, beaucoup d'obstacles. Favorise melee et control.
- **Sky Platform** : map large et ouverte, 3600×2200, peu d'obstacles, 2 heal packs centraux. Favorise sniper et poke.
- **Scrap Maze** : couloirs étroits, beaucoup de bushes, portails en série (A→B→C). Favorise embuscades et mobility.

### 6b. Features de map dynamiques

- **Obstacles destructibles** : pylons ou murs qui se cassent après X dégâts, modifiant le layout en cours de round.
- **Zones de danger** : sol électrifié qui tick des dégâts si on reste dessus (force le mouvement).
- **Heal packs améliorés** : variantes selon la map — petit heal rapide vs gros heal lent.
- **Buff pads** : zones au sol qui donnent un boost temporaire (haste, shield, damage) quand on marche dessus.

Pourquoi : 2 maps = la lassitude visuelle et tactique arrive très vite. L'environnement doit être un élément du gameplay, pas juste un décor.

Priorité : haute

---

## 7. HUD — afficher plus sans surcharger

Constat : le HUD montre la santé, l'arme, les cooldowns abilities. C'est propre mais il manque des infos clés.

Propositions :

- **Cooldowns ennemis** : barre discrète sous la HP bar de l'ennemi montrant l'état de ses Q/E/F (même approximatif).
- **Indicateur d'ultime ennemi** : signal visuel quand l'ennemi a son ultime prêt (lueur, icône).
- **Dégâts flottants** : nombres qui pop quand un tir connecte, avec la valeur de dégâts.
- **Indicateur de status** : icônes avec timer sous les barres de HP quand un statut est actif (slow, stun, burn).
- **Mini-résumé du build** : petite barre en bas avec l'icône arme + 3 icônes abilities (rappel constant du loadout).

Pourquoi : en combat, le joueur doit pouvoir lire la situation sans ouvrir de menu. Plus l'info est lisible, plus le skill expression est possible.

Priorité : moyenne-haute

---

## 8. Progression — étendre après le niveau 13

Constat : le système de progression cap au niveau 13. Après, plus rien à débloquer. XP = +1 par victoire duel, pas de XP en survie.

Propositions :

### 8a. XP en survie

- Gagner du XP en survie : +0.5 par vague complétée, +0.25 par vague passée en difficulté Hard+.

### 8b. Contenu post-13

- Niveaux 14-25 : débloquer les abilities verrouillées, nouveaux perks, ultimes restants.
- Niveaux 25+ : cosmétiques (skins d'arme, titres, badges exclusifs).

### 8c. Système de prestige

- Au niveau max, option de « prestige » : reset le niveau à 1, garde tous les unlocks, gagne un badge/titre permanent et un bonus cosmétique.
- Chaque prestige ajoute un marqueur visible sur le profil.

### 8d. Récompenses par palier

- Tous les 5 niveaux, une récompense visible : skin d'arme, badge, titre.
- Pas juste un unlock de contenu gameplay, mais une gratification visuelle.

Pourquoi : la progression est le moteur de la rétention. Sans contenu après 13, le joueur n'a plus de raison de jouer au-delà du fun pur.

Priorité : haute

---

## 9. Match — enrichir les formats

Constat : le duel est en BO3 fixe. Pas de timer de round, pas de sudden death, pas de forfeit.

Propositions :

- **BO5 et BO1** : rendre le format sélectionnable (déjà des boutons dans le HTML, les brancher à la logique).
- **Timer de round** : 90s par round. Si le temps expire, le joueur avec le plus de HP gagne le round.
- **Sudden Death** : si 1-1 en BO3, le round final commence avec les deux joueurs à 50% HP.
- **Forfeit** : bouton pour abandonner un match proprement (l'adversaire gagne, pas de XP pour le joueur).
- **Round replays** : après chaque round, court replay de 3s montrant le kill final (gel + zoom).

Pourquoi : le format fixe limite les variations de gameplay. Ces ajouts sont peu coûteux mais changent beaucoup la tension des matchs.

Priorité : moyenne-haute

---

## 10. Loadouts — statistiques et partage

Constat : la page loadouts permet CRUD + favoris + tags. Mais aucun suivi de performance par build.

Propositions :

### 10a. Stats par loadout

- Tracker : nombre de matchs joués, victoires, défaites, ratio par loadout.
- Afficher ces stats directement sur la carte du loadout dans la page Loadouts.
- Pouvoir trier les loadouts par winrate ou par fréquence d'utilisation.

### 10b. Codes de build

- Générer un code alphanumérique court pour chaque build (ex : `PSE-JAV-FLD-PSH-RAR-PHT`).
- Permettre d'importer un build depuis un code (champ texte dans la page Loadouts).
- Utile pour partager des builds hors du jeu (Discord, forums).

### 10c. Loadout recommandé

- Basé sur la dernière session : « Tu as joué X, ton meilleur loadout récent est Y ».
- Affiché sur le prematch comme suggestion rapide.

Pourquoi : un jeu build-driven doit mesurer les builds. Sans stats, le joueur ne sait pas ce qui marche.

Priorité : haute

---

## 11. Audio — implémenter de vrais assets

Constat : `audio.js` a une architecture propre (Web Audio API, 3 bus, persistence volume) mais aucun asset audio n'est importé. Le jeu est silencieux.

Propositions :

- Créer ou sourcer des SFX pour : tir par arme (8 sons), impact (3 variantes), abilities (9 sons), dash, heal pickup, portail.
- Musique de combat : au moins 2 tracks loopables, une pour la phase active et une pour le prematch.
- Ambiance de map : un drone/pad par thème de map.
- Son d'UI : clic bouton, sélection loadout, validation build.
- Audio spatial basique : panner les sons gauche/droite selon la position dans l'arène.

Pourquoi : l'audio est 50% du feedback combat. Un jeu d'arène silencieux perd énormément en immersion et en lisibilité.

Priorité : très haute

---

## 12. Collection — filtres et runes

Constat : la page Collection affiche les armes, abilities, perks et ultimates avec leur statut unlock. Mais il manque des éléments.

Propositions :

- **Afficher l'arbre de runes** : les 4 arbres (attack, defense, spells, utility) avec les 3 nœuds chacun, montrant la mécanique de chaque nœud.
- **Afficher les skins d'arme** : les 7 skins (stock, rustfang, shockglass, wastelux, bloodwire, toxicash, voidchrome) dans une section Cosmétiques.
- **Filtres** : filtrer par catégorie (offense, defense, mobility, control, utility), par statut (débloqué / verrouillé), par arme associée.
- **Synergies** : sur la fiche d'une ability, afficher les armes avec lesquelles elle fonctionne bien (ex : Magnetic Grapple + Shotgun = « Pull + Burst »).
- **Comparaison** : sélectionner 2 items pour voir leurs stats côte à côte.

Pourquoi : la Collection est la vitrine du contenu. Plus elle est interactive, plus le joueur explore les possibilités de build.

Priorité : moyenne

---

## 13. Interactions status effects — combos élémentaires

Constat : les status burn, slow, stun, shock, snare, freeze existent mais n'interagissent pas entre eux.

Propositions :

- **Freeze + Shock = Shatter** : bonus de dégâts (+20%) sur un ennemi freeze qui prend un coup shock.
- **Burn + Slow = Meltdown** : le burn tick plus fort (+50% dégâts) sur un ennemi slow.
- **Stun + Burn = Overload** : cible étourdie et en feu explose une petite AoE à la fin du stun.
- **Snare + tout dégât distance = Vulnerable** : cible snarée prend +15% de dégâts distance.

Pourquoi : les interactions de status sont le moteur de la profondeur dans les build-driven games. Ça récompense les joueurs qui construisent des combos entre arme et abilities.

Priorité : haute

---

## 14. Settings — page dédiée

Constat : les réglages audio sont dans le HUD de combat. Il n'y a pas de page Settings accessible hors match.

Propositions :

- Ajouter une page Settings dans le shell (nouveau `data-shell-view="settings"`).
- Sections : Audio (musique, SFX, ambiance), Contrôles (keybinds affichés, sensibilité souris), Affichage (qualité particules, résolution logique), Accessibilité (taille texte, contrastes).
- Persister tous les réglages dans `localStorage`.
- Retirer les sliders audio du HUD combat et les remplacer par un lien « Settings ».

Pourquoi : les réglages ne doivent pas être enterrés dans le match panel. Un joueur doit pouvoir configurer avant de jouer.

Priorité : moyenne

---

## 15. Renderer — quick wins visuels

Constat : le renderer Canvas 2D fonctionne mais manque de polish visuel.

Propositions :

- **Dégâts flottants** : texte de damage qui pop et fade out à chaque hit (déjà évoqué dans le HUD mais c'est du rendu canvas).
- **Trails d'arme** : traînée visuelle sur les projectiles (arc lumineux pour le sniper, flamme pour le shotgun).
- **Screen shake** différencié : léger sur un hit normal, fort sur un crit ou un finisher axe, zoom-shake sur un ultime.
- **Flash de mort** : quand un round finit, gel de l'écran 0.5s + flash blanc + zoom lent sur le vainqueur.
- **Bushs améliorés** : les bushes changent de teinte quand un ennemi invisible est dedans (feedback subtil).

Pourquoi : le feedback visuel est ce qui rend chaque action satisfaisante. Ce sont des petits ajouts avec un gros impact perçu.

Priorité : moyenne

---

## 16. Session — migrer vers localStorage

Constat : `session.js` utilise `sessionStorage` qui disparaît à la fermeture de l'onglet. Le joueur perd sa session en cas de crash ou fermeture accidentelle.

Propositions :

- Migrer le stockage session vers `localStorage` avec une clé différente de la progression.
- Ajouter un flag `isDirty` : si la session précédente était en plein match, afficher un prompt « Reprendre la session ? » au lancement.
- Sauvegarder les préférences utilisateur (audio, avatar, dernier mode joué) dans `localStorage` séparément.

Pourquoi : perdre sa config à chaque fermeture d'onglet est frustrant et inutile.

Priorité : moyenne

---

## 17. Weapon Skins — connecter au build

Constat : 7 skins d'arme sont définies dans `content.js` (stock, rustfang, shockglass, wastelux, bloodwire, toxicash, voidchrome) mais elles ne sont pas visibles dans la page Collection ni sélectionnables proprement.

Propositions :

- Afficher les skins dans la Collection (section Cosmétiques).
- Permettre de sélectionner un skin dans le loadout builder ou dans la page Loadouts.
- Lier certains skins à des paliers de prestige ou des achievements (ex : `voidchrome` = prestige 1, `bloodwire` = 50 victoires).

Pourquoi : les cosmétiques sont de la récompense gratuite. Le système existe, il suffit de le rendre visible et atteignable.

Priorité : moyenne-basse

---

## 18. Historique de matchs — vraie page ou section profil

Constat : le profil affiche un historique mockup. Aucune donnée de match n'est réellement enregistrée.

Propositions :

- À chaque fin de match (duel ou survie), enregistrer dans `localStorage` :
  - Résultat (win/loss/vague atteinte)
  - Mode (duel/survie)
  - Map
  - Build joueur (arme + abilities + perk + ultime)
  - Build adverse (en duel)
  - Score
  - Dégâts donnés / reçus (si trackés dans le combat)
  - Date
- Limiter à 50 derniers matchs (FIFO).
- Afficher dans le profil ou dans une sous-section dédiée.
- Permettre de filtrer par mode, par arme, par résultat.

Pourquoi : c'est la base de toute stat. Sans historique, ni le profil ni les stats de loadout ne peuvent exister avec de vraies données.

Priorité : haute

---

## Ordre de priorité recommandé

Par impact sur l'expérience joueur et faisabilité :

1. **IA niveaux de difficulté** — c'est le seul adversaire, il doit varier.
2. **Audio — implémenter de vrais assets** — un jeu silencieux ne retient personne.
3. **Débloquer des abilities** — passer de 9 à 15+ jouables.
4. **Profil — brancher les vraies données** — le profil doit être réel.
5. **Historique de matchs** — enregistrer les résultats pour alimenter profil et stats.
6. **Progression post-13** — XP survie, niveaux supplémentaires, prestige.
7. **Perks à 2 slots** — diversifier les builds.
8. **Maps nouvelles** — au moins 1 map supplémentaire avec layout différent.
9. **Interactions status effects** — combos élémentaires.
10. **Ultimates complets** — finir arenaLockdown et berserkCore.
11. **Stats par loadout** — tracker les performances par build.
12. **Match formats** — BO1/BO5, timer, sudden death.
13. **HUD enrichi** — cooldowns ennemis, dégâts flottants.
14. **Collection filtres + runes** — contenu page Collection.
15. **Codes de build** — partage de loadouts.
16. **Settings page** — réglages hors match.
17. **Skins connectés** — cosmétiques dans la progression.
18. **Renderer polish** — trails, flash, screen shake amélioré.

---

## Conclusion

Le v1 diagnostiquait les problèmes structurels. Ils ont été traités : shell extensible, pages en place, boucle de jeu propre.

Le v2 pose la question suivante : qu'est-ce qui fait que le joueur revient ?

La réponse tient en trois axes :

- **L'adversaire doit être intéressant.** L'IA doit varier, s'adapter, avoir des personnalités. C'est la priorité numéro un.
- **Le contenu doit donner des choix.** 9 abilities sur 28, 1 slot de perk, 3 ultimes : le système de build a la structure mais pas encore le volume.
- **Le feedback doit être complet.** Audio, dégâts visuels, historique des matchs, stats de build — chaque action du joueur doit laisser une trace visible.

Aucun de ces axes ne nécessite de refonte architecturale. Le code est prêt. Il faut maintenant remplir les tuyaux.
