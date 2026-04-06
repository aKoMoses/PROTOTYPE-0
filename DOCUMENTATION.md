# Prototype-0 — Documentation

## Qu'est-ce que Prototype-0 ?

Prototype-0 est un jeu d'arène compétitif 1v1 en vue top-down, développé en HTML/CSS/JavaScript vanilla avec Vite comme bundler. L'univers est post-apocalyptique cyberpunk : gladiateurs de récupération, armes bricolées, acier rouillé et néons.

Le joueur assemble un build complet (arme, abilities, perks, ultimate, runes, avatar) puis affronte un bot IA en duel dans une arène. L'objectif est de créer une fondation solide de jeu d'arène build-driven, lisible et nerveux.

## Stack technique

| Élément | Technologie |
|---|---|
| Langage | JavaScript ES modules |
| Rendu | Canvas 2D natif |
| Build tool | Vite 8 |
| Serveur | Statique (fichier `index.html`) |
| Dépendances | Aucune runtime — Vite en devDependency uniquement |

## Lancer le projet

```bash
# Installation
npm install

# Développement avec hot reload
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

Ou simplement ouvrir `index.html` dans un navigateur pour la version sans bundler.

## Architecture du code

```
index.html              Point d'entrée HTML (canvas, UI prematch, HUD)
styles.css              Styles globaux (UI, HUD, prematch overlay)
src/
  main.js               Game loop, initialisation, wiring des modules
  config.js             Constantes de gameplay (vitesses, dégâts, cooldowns, arène)
  content.js            Données de contenu (avatars, skins, armes, abilities, perks, runes)
  state.js              État mutable partagé (loadout, UI state, sandbox, player, enemy)
  dom.js                Références aux éléments DOM
  maps.js               Layouts des maps, portails, collisions, spawns
  utils.js              Fonctions utilitaires (math, géométrie, collision)
  build/
    ui.js               Interface prematch / Build Lab (steps, rendu, navigation)
    loadout.js           Logique de loadout et build du bot
  gameplay/
    abilities.js        Dash, abilities équipées (javelin, field, grapple, shield, etc.)
    combat.js           Projectiles, résolution de combat, impacts, zones de support
    effects.js          Effets visuels (particules, impacts, traînées)
    enemy.js            IA du bot duel + bots d'entraînement
    hud.js              Affichage tête haute en combat
    input.js            Gestion clavier, souris, joystick tactile
    match.js            Gestion du match (rounds, BO3, score, bannières)
    player.js           Logique du joueur (mouvement, état, reset)
    renderer.js         Rendu canvas (arène, entités, effets, décor)
    weapons.js          Logique de tir et comportement des armes
```

## Concepts clés

### Le Build Lab

Avant chaque session, le joueur passe par le **Build Lab** en 3 étapes :

1. **Mode** — Choix du sandbox : Duel (1v1 bot IA) ou Training (bots statiques)
2. **Map** — Choix de l'arène : Electro Gallery, Bric-a-Broc, Random Map, Training Range
3. **Build** — Construction du loadout complet :
   - **Weapon** : Pulse Rifle, Axe, Shotgun, Sniper, Staff, Injector
   - **Abilities** (3 slots) : Shock Javelin, Magnetic Field, Magnetic Grapple, Energy Shield, EMP Burst, Chain Lightning, Blink Step, Phase Dash, Pulse Burst, Rail Shot, Gravity Well, Phase Shift
   - **Perks** (2 slots) : Scavenger Plates, Reactive Armor, Dash Cooling, Execution Relay, Combo Driver, Shock Buffer
   - **Ultimate** : Phantom Split, Revival Protocol, EMP Cataclysm
   - **Runes** : Arbre de talents à 15 points (secondary / primary / capstone)
   - **Cosmétiques** : Avatar + skin d'arme

### Le combat

- Vue top-down, arène 1600×900
- Déplacement WASD, visée souris, tir clic
- Dash (Shift) avec invulnérabilité temporaire
- Abilities sur Q / E / F, Ultimate sur R
- Rounds courts en BO3
- HUD latéral : vie, cooldowns, Overdrive, état de l'arme

### Les maps

Chaque map a son propre layout avec :
- Décor thématique (couleurs, ambiance)
- Murs et obstacles avec collision
- Portails de repositionnement
- Spawns joueur / ennemi
- Zones décoratives (lanes, bridges, pits)

### L'IA

Le bot duel dispose d'un comportement de combat complet :
- Tir, esquive, usage d'abilities
- Build configurable (random ou custom)
- Bots d'entraînement statiques en mode Training

## Contrôles

| Action | Touche |
|---|---|
| Déplacement | WASD |
| Visée | Souris |
| Tir | Clic gauche |
| Dash | Shift |
| Ability 1 | Q |
| Ability 2 | E |
| Ability 3 | F |
| Ultimate | R |
| Reset session | Backspace |

Support tactile : joystick virtuel pour le mouvement sur mobile.

## Principes de développement

- **Lisibilité du combat** : le centre de l'arène doit toujours rester lisible
- **Modularité** : architecture data-driven, contenu extensible sans casser la base
- **Séparation gameplay / cosmétique** : les choix visuels ne polluent pas les décisions gameplay
- **Mobile-first** : pensé pour être jouable sur mobile avec contrôles tactiles
- **Zéro dépendance runtime** : JavaScript vanilla, pas de framework

## Direction visuelle

- Matériaux : métal usé, plaques de récupération, circuits exposés, verre industriel
- Palette : fonds sombres poussieux, bruns/gris/acier/rouille + accents néon (cyan, jaune, orange, violet)
- Effets : étincelles, arcs électriques, impulsions magnétiques, impacts francs
- Références : Mad Max, Fallout, cyberpunk post-apocalyptique, scrap-tech néon
