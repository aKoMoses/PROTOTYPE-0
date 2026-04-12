# Refonte IA - PROTOTYPE-0 vers une vraie IA de combat jouable en local et sur serveur

Date : 2026-04-12

## Objectif

Ce document decrit la refonte recommande pour faire evoluer l'IA de PROTOTYPE-0 d'un ensemble de comportements principalement executes dans le client vers une architecture plus propre, plus testable et compatible avec les rooms Colyseus autoritatives.

L'objectif n'est pas seulement d'avoir des bots plus forts.

L'objectif est d'obtenir une architecture coherente dans laquelle :

- une meme logique de decision bot peut rester jouable en solo, en training et en reseau ;
- les rooms reseau peuvent accueillir des bots sans retomber sur une simulation locale ;
- la decision IA peut etre executee cote serveur sans dependre du rendu navigateur ;
- la logique de combat critique reste autoritative cote Colyseus ;
- la progression produit ne persiste que les resultats des vrais joueurs humains ;
- la base de code IA devient plus lisible et plus simple a etendre.

Ce document ne contient pas de code.
Il pose les decisions techniques, les limites de l'architecture actuelle et les etapes de migration vers une IA vraiment compatible avec le multijoueur autoritatif.

---

## 1. Constat de depart

Aujourd'hui, PROTOTYPE-0 possede deja une IA jouable pour les modes locaux.

En pratique :

- les bots existent deja dans le moteur client ;
- leur comportement est pense pour un contexte solo ou pseudo-multijoueur local ;
- leur simulation est fortement couplee au gameplay client ;
- une partie de leur logique est melangee au rendu, aux effets et a l'etat local ;
- les presets de build et d'archetypes existent deja ;
- la logique actuelle est suffisante pour faire vivre le prototype ;
- mais elle n'est pas directement portable telle quelle dans une room Colyseus autoritative.

Autrement dit :

le projet a deja des bots jouables, mais pas encore une vraie architecture IA commune entre local et serveur.

La limite principale est simple :

une IA qui depend du moteur client n'est pas une bonne source de verite pour un match reseau autoritatif.

---

## 2. Probleme a resoudre

Depuis l'introduction des rooms Colyseus autoritatives, le projet est entre dans un etat hybride :

- les rooms 1v1 humaines peuvent etre jouees de facon autoritative ;
- les rooms 2v2 humaines peuvent maintenant etre routees vers une vraie room Colyseus ;
- mais les rooms 2v2 avec bots restent sur un fallback local ;
- ce fallback evite de casser les modes bots existants ;
- en revanche, il empeche d'avoir une architecture uniforme du combat reseau.

Ce compromis est volontairement prudent, mais il ne peut pas etre la cible finale.

La vraie cible doit etre :

- humain ou bot, tout participant d'un match reseau doit etre simule par le serveur ;
- le client n'est responsable que de l'affichage et des inputs humains ;
- les bots ne doivent pas exister comme une exception de simulation locale dans les rooms reseau.

---

## 3. Decision d'architecture

La bonne architecture IA cible pour ce projet est la suivante :

- une couche de decision IA unique, portable et testable ;
- des adaptateurs d'execution distincts selon le contexte local ou serveur ;
- logique de decision separee de la logique de rendu ;
- etat de combat autoritatif porte par le serveur pour tout match reseau ;
- persistence de fin de match reservee aux humains.

En une phrase :

l'IA doit devenir une productrice d'intentions de combat, pas une extension implicite du rendu client.

---

## 4. Principe directeur

La refonte IA ne doit pas commencer par copier-coller la logique existante du client dans Colyseus.

Le bon chemin est :

1. identifier ce qui releve de la decision IA ;
2. identifier ce qui releve du rendu, des VFX et de la presentation ;
3. isoler une couche de decision portable ;
4. executer cette couche cote serveur pour les matchs reseau ;
5. reutiliser cette meme couche cote local seulement quand un mode offline ou purement local en a besoin.

Autrement dit :

- le client peut continuer a faire tourner des bots pour les usages locaux ;
- mais il ne doit pas porter une logique IA metier differente de celle du serveur ;
- mais la room Colyseus ne doit jamais dependre de ces bots clients pour arbitrer un match reseau.

---

## 5. Etat actuel de l'IA

### 5.1 Ce qui existe deja

Le projet possede deja plusieurs briques utiles :

- logique de comportement bot cote client ;
- presets de build et archetypes ;
- comportement de cible, tir, deplacement et certaines abilities ;
- modes `Versus IA`, `Training` et variantes 2v2 locales ;
- lecture de l'etat de combat deja suffisante pour piloter un bot jouable.

### 5.2 Pourquoi cela ne suffit pas pour Colyseus

Cette IA actuelle n'est pas directement reutilisable telle quelle cote serveur pour plusieurs raisons :

- elle est trop couplee au state client ;
- elle manipule des structures de gameplay qui supposent l'existence du moteur local ;
- elle depend d'effets et d'artefacts non necessaires a la simulation autoritative ;
- elle n'est pas decoupee comme un module de decision pur ;
- elle a ete ecrite pour faire vivre un prototype, pas pour garantir une verite reseau.

---

## 6. Cible recommandee

La cible doit etre un systeme en deux couches fonctionnelles, pas deux IA concurrentes.

### 6.1 Niveau 1 : IA de decision

Cette couche doit prendre en entree un snapshot simplifie du monde :

- position du bot ;
- position des allies ;
- position des ennemis ;
- HP ;
- etat vivant ou mort ;
- cooldowns utiles ;
- informations minimales sur la distance, l'angle et la ligne de vue.

Elle doit produire en sortie une intention :

- direction de deplacement ;
- angle de visee ;
- envie de tirer ;
- envie d'activer une ability ;
- changement de cible eventuel.

Point essentiel :

- cette couche doit etre la meme en local et sur serveur ;
- elle ne doit pas connaitre le rendu, le DOM, le canvas ou les effets ;
- elle doit seulement consommer un snapshot standardise et produire une intention standardisee.

### 6.2 Niveau 2 : simulation autoritative

Pour les matchs reseau, cette couche reste dans Colyseus et arbitre :

- deplacement reel ;
- projectiles ;
- collisions ;
- degats ;
- morts ;
- score ;
- fin de round ;
- fin de match ;
- persistence des resultats.

La couche IA ne decide jamais seule qu'elle a touche, tue ou gagne.
Elle ne fait que proposer des actions au moteur de simulation autoritatif.

Pour les modes purement locaux, un adaptateur local peut consommer la meme intention IA, mais cela ne doit pas redefinir une seconde logique de decision.

---

## 7. Repartition des responsabilites

### 7.1 Ce que doit gerer le client

Le client doit rester responsable de :

- l'affichage ;
- le HUD ;
- les animations ;
- les inputs humains ;
- l'execution locale eventuelle de la couche de decision commune pour les modes non reseau si on choisit de les garder.

Le client ne doit pas rester la source de verite de bots engages dans un match reseau.

### 7.2 Ce que doit gerer Colyseus

Colyseus doit devenir responsable de :

- la presence des bots dans une room reseau ;
- leur etat autoritatif ;
- leur simulation tick par tick ;
- leurs tirs ;
- leurs collisions ;
- leur impact sur la victoire ou la defaite ;
- leur neutralisation propre a la fin d'un round ou d'un match.

### 7.3 Ce que doit gerer Supabase

Supabase doit rester responsable de :

- l'identite des humains ;
- les loadouts persistants des humains ;
- l'historique de match ;
- la progression ;
- les rooms produit ;
- les snapshots de lobby utiles a l'entree en match.

Supabase ne doit pas devenir le moteur de decision des bots.

---

## 8. Regle produit sur les bots

La regle cible doit etre explicite :

- dans un match reseau, les bots sont des participants serveur ;
- les bots peuvent influencer l'issue du match ;
- mais ils ne generent pas de progression pour eux-memes ;
- seuls les humains ont un historique, des stats et de l'XP persistants ;
- les bots peuvent rester visibles dans la lecture du match, mais jamais comme de vrais comptes produit.

---

## 9. Strategie de migration recommandee

### 9.1 Etape 1 - Stabiliser un bot serveur minimal

Objectif : sortir du fallback local pour les rooms 2v2 avec bots.

Travail attendu :

- creer une representation serveur d'un bot ;
- completer automatiquement les slots manquants d'une room 2v2 ;
- donner au bot un comportement minimal : choisir une cible, bouger, viser, tirer ;
- laisser les abilities speciales de cote dans un premier temps.

Resultat attendu :

une room 2v2 avec bots peut tourner entierement sur Colyseus sans dependre de l'IA client existante.

### 9.2 Etape 2 - Extraire une couche de decision IA propre

Objectif : rendre l'IA plus testable et portable.

Travail attendu :

- separer la decision du bot des details de presentation ;
- definir des inputs standardises pour l'IA ;
- definir des outputs standardises utilisables par la room ;
- brancher cette meme couche sur un adaptateur serveur et, si necessaire, sur un adaptateur local.

Resultat attendu :

l'IA cesse d'etre une extension implicite du gameplay client et cesse d'exister en deux versions metier distinctes.

### 9.3 Etape 3 - Reintroduire des comportements plus riches

Objectif : retrouver l'interet de combat des bots actuels.

Travail attendu :

- ajouter kite, strafe, changement de cible plus intelligent ;
- ajouter des profils par archetype ;
- ajouter l'usage progressif des abilities cote serveur ;
- brancher la difficulte sur de vraies differences de comportement plutot que sur de simples bonus caches.

Resultat attendu :

les bots executes cote serveur deviennent non seulement fonctionnels, mais aussi interessants a combattre.

### 9.4 Etape 4 - Aligner experience locale et experience reseau

Objectif : eviter deux jeux trop differents.

Travail attendu :

- garder une meme logique de decision entre execution locale et execution serveur ;
- conserver des differences seulement quand elles sont justifiees par les contraintes de plateforme ;
- documenter clairement ce qui reste local-only.

Resultat attendu :

le jeu reste lisible pour les joueurs et maintenable pour l'equipe.

---

## 10. Ce qu'il ne faut pas faire

### 10.1 Copier toute l'IA client dans Colyseus en un bloc

Ce serait le moyen le plus rapide de dupliquer du code fragile et de transporter des dependances de rendu dans le serveur.

### 10.2 Faire des bots "fake serveur"

Par exemple :

- un bot decide localement ;
- le client envoie ensuite un resultat au serveur ;
- le serveur se contente de le relayer.

Ce serait contraire a toute la refonte autoritative.

### 10.3 Vouloir porter toutes les abilities d'abord

Le premier besoin n'est pas la richesse tactique maximale.
Le premier besoin est d'avoir une base autoritative propre.

Le bon MVP est :

- deplacement ;
- cible ;
- visee ;
- tir principal.

Le reste vient ensuite.

---

## 11. Risques a anticiper

### Risque 1 - IA trop coulee dans le code client

Si l'IA reste definie comme un effet secondaire du moteur local, elle restera difficile a porter, tester et faire evoluer.

### Risque 2 - divergence entre bots locaux et bots serveur

Si local et serveur embarquent chacun leur propre logique de decision, le jeu finira par avoir deux comportements bots trop differents.

### Risque 3 - difficultes artificielles mal pensees

Augmenter simplement les HP, la precision ou le fire rate ne remplace pas une meilleure decision IA.

### Risque 4 - faire persister les bots comme de faux joueurs

Ce serait une confusion produit. Les bots sont des acteurs de match, pas des comptes.

### Risque 5 - sous-estimer le cout du portage complet

Une vraie IA portable, reutilisable cote serveur puis cote local, prend du temps si on veut embarquer toutes les abilities. Il faut accepter un MVP fonctionnel avant une IA complete.

---

## 12. Decision executable

Le prochain lot utile n'est pas de rendre les bots brillants.

Le prochain lot utile doit etre :

- creation d'un bot serveur minimal pour `team_duel` ;
- suppression du fallback local pour les rooms 2v2 avec bots ;
- filtrage des bots hors de la persistence Supabase ;
- conservation des modes IA locaux existants pour les experiences offline ou purement locales.

Avant ce lot, le 2v2 avec bots reste un compromis hybride.

Apres ce lot, PROTOTYPE-0 aura une vraie base de combat 2v2 autoritatif uniforme :

- humains et bots dans la meme simulation serveur ;
- resultat arbitre au meme endroit ;
- fin de match propre ;
- evolution IA possible sans detourner le client de son role.

---

## 13. Conclusion

La bonne refonte IA pour PROTOTYPE-0 n'est pas de chercher tout de suite une IA plus spectaculaire.

La bonne refonte est d'abord une clarification architecturale :

- une decision IA commune d'un cote ;
- une simulation autoritative de l'autre ;
- persistence humaine seulement ;
- et une trajectoire nette entre execution locale offline et execution serveur reseau sans dupliquer le cerveau des bots.

Le critere de succes final est simple :

une room 2v2 avec ou sans bots peut etre preparee dans le lobby, executee integralement sur Colyseus, produite comme un vrai match autoritatif, puis renvoyer un resultat fiable vers Supabase pour les seuls joueurs humains.