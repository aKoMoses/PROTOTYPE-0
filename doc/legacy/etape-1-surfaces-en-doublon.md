# Etape 1 - Surfaces encore en doublon

Date : 2026-04-12

## Objectif

Documenter les surfaces client qui existent encore en parallele dans PROTOTYPE-0 pour distinguer :

- les vrais doublons actifs ;
- les couches root-level encore actives mais deja absorbees par la shell ;
- les flows encore partages entre shell et prematch.

---

## Resume rapide

Le doublon le plus net aujourd'hui est la vue Dev Status.

Le reste de la dette legacy identifiee tient surtout a deux choses :

- des couches root-level encore chargees dans `index.html` sans etre des pages standalone paralleles ;
- une zone de transition encore hybride entre la page Play shell et le prematch gameplay.

---

## 1. Pages standalone encore presentes

Les pages HTML encore exposees au build sont :

- `index.html`
- `dev-status.html`

Conclusion :

- il n'y a plus de page HTML standalone `profile`, `collection` ou `loadout` ;
- le seul vrai point d'entree secondaire encore vivant est `dev-status.html`.

---

## 2. Doublons confirmes

### 2.1 Dev Status

Surface standalone :

- `dev-status.html`
- `dev-status.js`
- `dev-status.css`

Surface shell equivalente :

- vue `dev` dans `index.html`
- `src/pages/dev/dev-page.js`

Pourquoi c'est un doublon confirme :

- les deux surfaces affichent le meme dashboard de statut ;
- les deux lisent `doc/DOCUMENTATION.md` et `doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md` ;
- les deux s'appuient sur les memes panneaux de rendu ;
- la version standalone reste encore accessible depuis le HUD du jeu.

Verdict :

- doublon complet ;
- actif ;
- candidat prioritaire a arbitrage.

---

## 3. Couches root-level encore actives

Ces surfaces ne sont pas des pages paralleles, mais elles restent importantes dans la lecture du legacy.

### 3.1 Auth

Surface active :

- `auth.js`
- `auth.css`
- `#auth-screen` dans `index.html`

Etat :

- gate global avant acces a l'application ;
- pas de vue shell dediee ;
- pas un doublon de page.

### 3.2 Profile

Surface active :

- `src/pages/profile/profile-page.js`
- `profile.css`

Etat :

- rendu deja porte par la shell ;
- plus de page standalone equivalente detectee.

### 3.3 Collection

Surface active :

- `src/pages/collection/collection-page.js`
- `collection.css`

Etat :

- meme situation que Profile ;
- legacy surtout structurel, pas produit.

### 3.4 Loadouts et builder

Surface active :

- `src/pages/loadouts/loadouts-page.js`
- `loadout.css`
- `loadout-builder.js`
- `loadout-builder.css`

Etat :

- la vue Loadouts est bien une vue shell ;
- le builder reste une couche root-level ;
- le prematch reutilise la meme surface loadout via `#prematch-loadout-host`.

Verdict :

- pas un doublon page contre page ;
- mais une surface partagee entre shell et prematch.

---

## 4. Flows encore partages entre shell et prematch

### 4.1 Page Play vs mode select prematch

Surface shell :

- `src/pages/play/play-page.js`

Surface prematch :

- `#mode-screen`
- `src/build/ui.js`
- `src/gameplay/match.js`

Recouvrement :

- la page Play porte deja l'intention de jeu ;
- le prematch repropose encore une partie de la selection de mode.

Verdict :

- zone de transition active ;
- frontiere encore floue entre navigation produit et lancement de session.

### 4.2 Custom rooms

Surface shell :

- ecrans `custom-list`, `custom-create`, `custom-lobby` dans `src/pages/play/play-page.js`

Surface prematch :

- `src/matchmaking/orchestrator.js`
- `src/matchmaking/components/custom-room-browser.js`
- `src/matchmaking/components/custom-room-lobby.js`

Recouvrement :

- les deux surfaces savent lister, creer, rejoindre et gerer une room ;
- les deux reposent sur la meme couche service ;
- la navigation prematch garde encore ses evenements globaux dedies.

Verdict :

- doublon fonctionnel confirme ;
- second sujet prioritaire apres Dev Status.

### 4.3 Build picker

Surface shell :

- vue Loadouts

Surface prematch :

- etape Build

Recouvrement :

- la meme racine `#loadout-root` est reutilisee dans deux contextes differents.

Verdict :

- pas un doublon de contenu ;
- mais une responsabilite encore partagee entre produit et lancement de match.

---

## 5. Synthese exploitable

Priorites qui ressortent de cette etape 1 :

1. arbitrer la survie de `dev-status.html` face a la vue Dev shell ;
2. choisir une seule porte d'entree pour les custom rooms ;
3. traiter explicitement Loadouts comme surface partagee shell/prematch ;
4. requalifier `auth.js` et les CSS root-level restants comme dependances shell assumees ou comme cibles de reintegration.

Conclusion :

- doublon complet confirme : Dev Status ;
- doublon fonctionnel confirme : custom rooms shell vs prematch ;
- zones root-level encore actives : auth, builder, styles shell-adjacents ;
- zone de transition majeure : Play -> prematch.