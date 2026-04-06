# Prototype-0 — Évolutions

Feuille de route des évolutions envisagées pour le jeu, organisées par dimension.
La priorité immédiate est l'**IA et le challenge solo**.

---

## 1. IA et challenge solo (priorité haute)

L'IA est le pilier central du jeu tant qu'il n'y a pas de multijoueur. Elle doit devenir un vrai adversaire crédible.

- [ ] Bot avec builds complets : le bot IA utilise l'intégralité du système de build (arme, abilities, perks, ultimate, runes)
- [ ] Comportements adaptatifs : le bot s'adapte au style de jeu du joueur (agressif contre défensif, spacing contre rush)
- [ ] Niveaux de difficulté : Easy / Normal / Hard / Nightmare avec des réglages de réaction, précision et prise de décision
- [ ] Patterns de combat variés : le bot alterne entre phases d'agression, de recul, de zoning et de burst
- [ ] Usage intelligent des abilities : timing des shields, grapples défensifs, combos javelin + arme
- [ ] Personnalités de bot : sniper patient, axe rusher, support zoner — chaque bot a un style lisible
- [ ] Mode survie / vagues : séries d'ennemis avec difficulté croissante pour tester l'endurance du build

---

## 2. Combat et gameplay

Tout ce qui rend les rounds plus profonds et plus techniques.

### Nouvelles armes
- [ ] Armes avec des identités radicalement différentes (lance charge, fouet zone, arme lourde lente)
- [ ] Chaque arme doit changer fondamentalement le plan de jeu

### Combos et synergies
- [ ] Synergies inter-armes / abilities : certaines combinaisons créent des effets bonus
- [ ] Combos lisibles et récompensants (javelin → dash → melee par exemple)

### Statuts et conditions
- [ ] Système de statuts en combat : burn (dégâts dans le temps), freeze (ralentissement fort), poison (drain continu), shock (interruption)
- [ ] Interactions entre statuts (freeze + shock = shatter bonus, etc.)
- [ ] Statuts lisibles visuellement sur les entités

### Modes de tir alternatifs
- [ ] Tir secondaire par arme (charge shot, burst mode, spread)
- [ ] Enrichir la profondeur de chaque arme sans ajouter de complexité de menu

---

## 3. Modes de jeu

Le jeu reste centré sur le **1v1** mais s'enrichit en formats.

- [ ] Mode survie / vagues d'ennemis avec progression de difficulté
- [ ] Mode classé / ranked avec système ELO pour les duels en ligne (quand le multijoueur sera prêt)
- [ ] Variations de règles de duel : BO5, round timer, sudden death, mirror match

---

## 4. Progression et méta-game

Le joueur doit sentir qu'il avance même entre les sessions.

- [ ] Unlocks d'armes et d'abilities : déblocage progressif du contenu via le jeu
- [ ] Système de saison / battle pass : récompenses cosmétiques sur une durée définie
- [ ] Classement / leaderboard : tableau des meilleurs joueurs (par ELO, win rate, survie)
- [ ] Statistiques de build : quels builds performe le mieux, quelles armes sont les plus utilisées

---

## 5. Univers et immersion

Renforcer la sensation d'être dans un monde post-apo cohérent.

### Son et musique
- [ ] Musique dynamique qui s'adapte à l'intensité du combat
- [ ] FX sonores distincts par arme, ability et statut
- [ ] Ambiance sonore des maps (vent, grésillement, machines)

### Cinématiques et présentations
- [ ] Intro de round : animation courte du gladiateur avec son build
- [ ] Présentation de build pré-match : affichage dramatique de l'arme et des abilities
- [ ] Animation de victoire / defeat

### Environnements dynamiques
- [ ] Éléments destructibles : murs qui se brisent, couvertures temporaires
- [ ] Événements météo : pluie acide (dégâts de zone), tempête de sable (visibilité réduite), EMP (cooldowns allongés)
- [ ] Événements qui changent les conditions du round en cours

---

## 6. Personnalisation

Enrichir l'identité visuelle du gladiateur sans polluer le gameplay.

- [ ] Skins d'armes avancés : effets visuels, trails de projectiles, lueurs custom
- [ ] Emotes / taunts : animations expressives utilisables entre les rounds
- [ ] Titres / badges / emblèmes : identité compétitive affichée
- [ ] Customisation de l'arène personnelle : choix d'ambiance, de couleurs d'accent
- [ ] Kill animations : effets visuels spéciaux sur le dernier coup

---

## 7. Technique et plateforme

Les fondations nécessaires pour que le jeu grandisse.

### Multijoueur en ligne
- [ ] Infrastructure WebSocket ou WebRTC pour du 1v1 en temps réel
- [ ] Netcode avec prediction client et reconciliation serveur
- [ ] Matchmaking basé sur ELO
- [ ] Anti-cheat basique côté serveur

### Mobile
- [ ] Optimisation des performances canvas sur mobile
- [ ] Contrôles tactiles affinés : joystick + boutons d'abilities ergonomiques
- [ ] UI responsive pour les écrans petits
- [ ] Support orientation paysage forcée

---

## Principes à respecter dans toutes les évolutions

- La **lisibilité du combat** prime sur tout
- Le **centre de l'arène** doit rester propre
- Chaque ajout doit **renforcer l'identité build-driven** du jeu
- Préférer **peu de systèmes solides** à beaucoup de systèmes fragiles
- Garder une **architecture modulaire** et data-driven
- Ne pas simuler de fausse profondeur avec du bruit visuel
