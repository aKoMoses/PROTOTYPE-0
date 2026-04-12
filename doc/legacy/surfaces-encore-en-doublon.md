# Audit - surfaces legacy encore en doublon

Date : 2026-04-12

## Objectif

Documenter les surfaces client qui existent encore en parallele dans PROTOTYPE-0 afin de distinguer :

- les vrais doublons actifs ;
- les couches root-level encore chargees mais deja absorbees par la shell ;
- les flows shell -> play -> prematch qui se recouvrent encore ;
- les scripts root-level qui gardent une responsabilite produit reelle.

Ce document couvre l'etape 9.1 du plan de refonte legacy UI/gameplay.

---

## 1. Resume executif

Constat principal : il reste un seul doublon clair et entierement confirme, la vue Dev Status.

Le reste du legacy repere n'est pas duplique sous forme de pages HTML paralleles, mais plutot sous forme de couches root-level encore chargees dans `index.html` ou de flows de lancement encore partages entre la shell Play et le prematch in-game.

En pratique, le repo se repartit aujourd'hui en trois categories :

1. un doublon complet : `dev-status.html` face a la vue shell Dev ;
2. des dependances root-level encore actives mais deja absorbees dans la shell : `auth.js`, `loadout-builder.js`, plusieurs CSS root-level ;
3. une zone de transition encore hybride : selection de mode, custom rooms et build flow entre `src/pages/play/*` et le prematch gameplay.

---

## 2. Pages standalone encore presentes

### 2.1 Pages HTML actives au build

Les entrees HTML explicitement construites par Vite sont :

- `index.html` : entree principale du produit ;
- `dev-status.html` : seconde entree standalone encore exposee au build.

Conclusion : il n'existe plus aujourd'hui de pages HTML standalone `auth`, `profile`, `collection` ou `loadout` paralleles a la shell. Le doublon root-level visible dans le repo est donc beaucoup plus limite que la simple liste des fichiers CSS/JS ne pourrait le laisser croire.

### 2.2 Pages standalone non justifiees ou a arbitrer

- `dev-status.html` reste la seule page standalone qui duplique directement une vue shell equivalente.

---

## 3. Doublons confirmes

### 3.1 Dev Status : doublon complet shell + standalone

Surface standalone :

- `dev-status.html`
- `dev-status.js`
- `dev-status.css`

Surface shell equivalente :

- section `shell-view-dev` dans `index.html`
- `src/pages/dev/dev-page.js`

Pourquoi c'est un doublon reel :

- les deux surfaces affichent la meme promesse produit : status board, snapshot projet, changelog, architecture, controles, principes ;
- les deux lisent les memes sources documentaires : `doc/DOCUMENTATION.md` et `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md` ;
- les deux s'appuient sur les memes ids de panneaux : `status-strip`, `overview-panel`, `latest-update-panel`, `flow-panel`, `architecture-panel`, `controls-panel`, `principles-panel` ;
- le jeu garde encore un lien direct vers `./dev-status.html` depuis le HUD, ce qui maintient la version standalone dans le flow actif.

Verdict : doublon confirme, actif, maintenu en parallele.

Risque :

- drift visuel ;
- drift fonctionnel ;
- correctifs documentaires appliques a une seule vue ;
- deux points d'entree produit pour une meme intention.

---

## 4. Couches root-level encore actives mais pas vraiment en doublon

Ces surfaces ne sont pas aujourd'hui des pages paralleles. Elles restent cependant des reliquats structurels du root-level et doivent etre documentees car elles brouillent la lecture du client cible.

### 4.1 Auth gate root-level

Surface active :

- `auth.js`
- `auth.css`
- bloc `#auth-screen` dans `index.html`

Etat reel :

- l'auth n'existe pas comme vue shell dediee ;
- la couche est injectee directement au niveau root et masque l'application tant que le compte n'est pas authentifie ;
- `auth.js` pilote cet overlay via `src/lib/account/service.js`.

Verdict : pas un doublon de page, mais une couche root-level encore hors shell.

Lecture legacy :

- acceptable tant que l'auth doit rester un gate global ;
- a reclasser plus tard soit comme vraie responsabilite shell, soit comme overlay systeme explicitement assume.

### 4.2 Profile

Surface active :

- `src/pages/profile/profile-page.js`
- `profile.css`
- conteneur `#profile-content` dans `index.html`

Etat reel :

- aucune page HTML standalone profile n'est encore servie ;
- le style reste root-level, mais le rendu produit vit deja dans la shell.

Verdict : pas de doublon produit, seulement une separation de fichiers encore tres root-level.

### 4.3 Collection

Surface active :

- `src/pages/collection/collection-page.js`
- `collection.css`
- conteneur `#collection-root` dans `index.html`

Etat reel :

- meme situation que Profile ;
- plus de surface standalone equivalente detectee.

Verdict : pas de doublon produit, mais une couche de styling root-level conservee.

### 4.4 Loadouts + builder

Surface active :

- `src/pages/loadouts/loadouts-page.js`
- `loadout.css`
- `loadout-builder.js`
- `loadout-builder.css`
- conteneur `#loadout-root` dans `index.html`

Etat reel :

- la page Loadouts existe comme vue shell ;
- le builder n'est pas une page standalone, mais un overlay root-level encore importe depuis la racine ;
- le build flow prematch reutilise la meme surface `#loadout-root` en la deplacant temporairement vers `#prematch-loadout-host`.

Verdict : pas un doublon au sens page A / page B, mais une surface sharee entre shell et prematch avec une mecanique de reparenting DOM.

Lecture legacy :

- bonne reduction de duplication de contenu ;
- structure encore transitoire car la vue shell Loadouts sert aussi de build picker in-game.

---

## 5. Scripts root-level encore reels

Scripts root-level encore branches au produit :

- `shell-ui.js` : bootstrap de navigation shell, chargement lazy des vues et gestion lifecycle/reseau ;
- `auth.js` : gate d'authentification avant acces au produit ;
- `loadout-builder.js` : overlay de forge utilise depuis la vue Loadouts ;
- `dev-status.js` : logique de la vue Dev Status standalone.

Conclusion :

- `shell-ui.js` et `auth.js` ont une responsabilite produit claire ;
- `loadout-builder.js` reste utile mais ancre encore une logique importante au niveau racine ;
- `dev-status.js` est le script root-level le plus clairement candidat a suppression ou absorption, car sa responsabilite existe deja dans la shell.

---

## 6. Flows encore partages entre shell et prematch

La dette principale restante n'est pas seulement une duplication de fichiers. Elle se situe aussi dans les flows.

### 6.1 Selection de mode : Play shell vs prematch mode select

Surface shell :

- `src/pages/play/play-page.js`

Surface prematch :

- `#mode-screen` dans `index.html`
- `src/build/ui.js`
- `src/gameplay/match.js`

Recouvrement constate :

- la page Play propose deja l'intention de jeu : Classique, Survie, Training ;
- la couche prematch repropose encore les modes Duel, Survival, Team Duel, Training, Custom ;
- la navigation produit et la navigation de lancement cohabitent donc encore avec une frontiere imparfaite.

Verdict : zone de transition active, pas encore architecture cible.

### 6.2 Custom rooms : duplication fonctionnelle nette

Surface shell :

- `src/pages/play/play-page.js`
- ecrans `custom-list`, `custom-create`, `custom-lobby`

Surface prematch :

- `src/matchmaking/orchestrator.js`
- `src/matchmaking/components/custom-room-browser.js`
- `src/matchmaking/components/custom-room-lobby.js`
- ecrans `#room-browser-screen` et `#custom-lobby-screen` dans `index.html`

Recouvrement constate :

- les deux surfaces permettent de lister, creer, rejoindre et gerer une custom room ;
- les deux s'appuient sur la meme couche service rooms / Supabase ;
- `src/gameplay/match.js` garde encore des evenements globaux `p0-enter-custom-lobby` et `p0-leave-custom-lobby` pour piloter la navigation prematch ;
- la shell Play sait aussi lancer directement le match multijoueur via `MultiplayerMatch`.

Verdict : doublon fonctionnel encore actif entre shell Play et prematch custom-room flow.

Risque :

- deux UX pour entrer dans le meme mode reseau ;
- maintenance en double des etats lobby ;
- arbitrage plus difficile sur la vraie porte d'entree multijoueur.

### 6.3 Build selection : surface unifiee mais contexte duplique

Surface shell :

- vue Loadouts dans la shell

Surface prematch :

- etape Build du prematch

Recouvrement constate :

- la meme racine `#loadout-root` est deplacee de la shell vers le prematch ;
- la meme logique produit sert donc a la fois de gestionnaire de decks permanent et de picker de session immediate.

Verdict : pas un doublon de contenu, mais une responsabilite encore partagee entre contexte produit et contexte lancement de match.

### 6.4 In-game reopening du prematch

Surface active :

- `src/main.js`
- `src/gameplay/input.js`
- `src/build/ui.js`

Recouvrement constate :

- le jeu conserve la capacite d'ouvrir directement le prematch depuis la partie ;
- le prematch reste donc plus qu'un simple setup initial : il continue a vivre comme pseudo-menu secondaire du mode Game.

Verdict : zone transitoire acceptable, mais encore eloignee d'une shell strictement dominante.

---

## 7. Carte de classification

| Surface | Statut | Verdict |
| --- | --- | --- |
| `dev-status.html` + `dev-status.js` | active | doublon confirme avec la vue Dev shell |
| `auth.js` + `auth.css` + `#auth-screen` | active | couche root-level hors shell, pas un doublon de page |
| `profile-page.js` + `profile.css` | active | vue shell unique, legacy surtout structurel |
| `collection-page.js` + `collection.css` | active | vue shell unique, legacy surtout structurel |
| `loadouts-page.js` + `loadout-builder.js` | active | surface sharee shell/prematch, pas une page parallele |
| Play custom rooms | active | doublon fonctionnel avec le prematch custom-room flow |
| Prematch mode select | active | zone de transition qui recoupe la page Play |

---

## 8. Conclusion exploitable pour la suite

Les zones legacy encore actives ne sont pas toutes du meme type.

Ce qui doit etre traite en premier :

1. arbitrer `dev-status` pour ne garder qu'une seule vue Dev ;
2. choisir une seule porte d'entree pour les custom rooms ;
3. documenter explicitement que le build picker Loadouts est aujourd'hui une surface partagee shell/prematch et non deux produits differents ;
4. requalifier `auth.js` et les CSS root-level restants comme dependances shell assumees ou comme cibles de reintegration ulterieure.

Conclusion generale :

- doublon complet confirme : Dev Status ;
- doublon fonctionnel confirme : custom rooms shell vs prematch ;
- zone de transition majeure : Play -> prematch ;
- residus root-level encore actifs mais pas forcement en double : auth, styles shell-adjacents, builder.