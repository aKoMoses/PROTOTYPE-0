# Refonte Legacy UI Gameplay - PROTOTYPE-0 vers une base client plus nette et moins dupliquee

Date : 2026-04-12

## Objectif

Ce document decrit une refonte produit et technique pour reduire les couches UI et gameplay legacy qui cohabitent encore dans PROTOTYPE-0 apres les refontes architecture, IA et PWA mobile.

L'objectif n'est pas seulement de supprimer quelques fichiers anciens.

L'objectif est d'obtenir une base client plus coherente dans laquelle :

- les vues shell deviennent la source principale de navigation produit ;
- les anciens ecrans standalone ne restent pas en doublon sans role clair ;
- les flows prematch historiques ne restent pas melanges a des flows shell modernes sans frontiere nette ;
- les composants UI morts ou purement decoratifs sont supprimes avant de continuer a construire dessus ;
- les messages de secours, placeholders et fallback copy restent alignes sur le produit reel ;
- la base front devient plus lisible avant les prochaines evolutions gameplay et reseau.

Ce document ne contient pas de code.
Il pose les decisions de nettoyage, les zones legacy a traiter en priorite et les etapes de migration vers une couche client plus simple a maintenir.

---

## 1. Constat de depart

Aujourd'hui, PROTOTYPE-0 a deja franchi plusieurs refontes importantes :

- shell principal multi-vues ;
- couches compte et reseau plus explicites ;
- base PWA mobile ;
- rooms reseau autoritatives ;
- prematch recentre autour du mode, de la map, du build et des custom rooms.

Mais en pratique, le client conserve encore plusieurs traces de generations precedentes :

- des pages root-level qui doublonnent partiellement les vues shell ;
- des flows UI historiques encore presents a cote de flows plus recents ;
- des fichiers standalone conserves alors que la navigation produit principale passe maintenant par le shell ;
- des textes de fallback herites de prototypes precedents ;
- des morceaux de styling ou de presentation supprimes du HTML mais encore identifies comme candidats a cleanup ;
- des frontieres encore floues entre ce qui releve du produit actuel et ce qui releve d'une couche de transition.

Autrement dit :

le projet a deja avance vers une architecture plus propre, mais il reste un travail specifique de refonte legacy sur le client lui-meme.

La limite principale est simple :

si le code legacy reste melange au code cible, chaque nouvelle feature devient plus lente a ecrire, plus risquee a corriger et plus dure a relire.

---

## 2. Probleme a resoudre

Le probleme n'est pas seulement la presence de code mort au sens strict.

Le probleme est plus large :

- certains blocs sont encore actifs mais portent une architecture ancienne ;
- certaines pages ont encore une utilite historique mais plus vraiment une utilite produit ;
- certains flows UX sont deja remplaces conceptuellement mais pas encore supprimes techniquement ;
- certaines couches de presentation racontent encore l'ancien projet pendant que d'autres racontent le projet cible.

Ce type de dette est trompeur parce qu'elle ne casse pas toujours le build.

Mais elle casse autre chose :

- la lisibilite ;
- la vitesse de decision ;
- la clarte des responsabilites ;
- la confiance dans ce qu'on peut supprimer ;
- la capacite a refactorer proprement les couches gameplay, shell, IA et reseau.

---

## 3. Decision produit et technique

La bonne cible pour cette refonte est la suivante :

- un shell unique comme porte d'entree produit principale ;
- un nombre minimal de pages standalone encore tolerees ;
- un prematch explicitement assume comme flow de lancement in-game tant qu'il n'a pas ete absorbe par le shell ;
- la suppression des doublons root-level qui ne servent plus de vrai point d'entree ;
- une politique stricte sur les placeholders et fallback copy visibles ;
- un nettoyage progressif mais deliberement structure des reliquats gameplay/UI.

En une phrase :

le client doit cesser d'etre un melange de generations de prototype et devenir une seule application web avec quelques zones de transition clairement identifiees.

---

## 4. Principe directeur

La refonte legacy UI/gameplay ne doit pas etre une purge aveugle.

Le bon chemin est :

1. distinguer ce qui est reellement mort de ce qui est seulement transitoire ;
2. distinguer ce qui est produit-cible de ce qui est compatibilite historique ;
3. documenter les zones ou deux couches paralleles existent encore ;
4. supprimer d'abord les doublons sans responsabilite claire ;
5. ne refactorer les zones de transition qu'une fois leur cible remplacee explicitement.

Autrement dit :

- on supprime d'abord les morceaux sans role ;
- on cadre ensuite les morceaux encore utiles mais mal places ;
- on ne garde pas indefiniment des couches paralleles juste parce qu'elles ne cassent rien aujourd'hui.

---

## 5. Zones legacy identifiees

### 5.1 Duplication des vues dev

La zone la plus evidente est la duplication entre :

- la page standalone `dev-status.html` / `dev-status.js` ;
- la vue shell `src/pages/dev/dev-page.js`.

Les deux portent la meme intention produit :

- charger la documentation ;
- parser le changelog ;
- afficher un dashboard de statut.

Risque actuel :

- drift fonctionnel ;
- drift visuel ;
- corrections appliquees a une vue mais pas a l'autre ;
- double maintenance inutile.

### 5.2 Pages root-level paralleles au shell

Le repo contient encore plusieurs fichiers root-level ou styles associes qui peuvent correspondre a une generation precedente de navigation produit :

- auth ;
- profile ;
- collection ;
- loadout builder ;
- pages annexes historiques.

Tous ne sont pas forcement morts.
Mais ils meritent un audit explicite pour distinguer :

- ce qui est encore réellement servi ;
- ce qui n'est plus qu'un residu de structure ;
- ce qui devrait etre absorbe par le shell ;
- ce qui devrait etre retire completement.

### 5.3 Flow prematch historique encore central

Le prematch actif n'est pas du code mort.
Mais il reste une couche structurellement ancienne au regard du shell moderne.

Aujourd'hui :

- le shell organise la navigation produit globale ;
- la page Play organise les intentions de jeu ;
- puis le prematch in-game reprend la main pour mode, map, build ou custom-room launch.

Cette coexistence reste acceptable a court terme.
Mais elle doit etre documentee comme zone de transition, pas comme architecture finale implicite.

### 5.4 Placeholder produit visibles

Les placeholders visibles restants ne sont pas tous des bugs.

Il existe encore par exemple :

- des cartes produit volontairement grisees ;
- des textes de secours quand des metadonnees changelog manquent ;
- des messages compte ou reseau utilitaires ;
- des libelles de remplacement pour builds, maps ou profils non resolus.

Le probleme n'est pas leur existence.

Le probleme est de ne pas distinguer :

- les placeholders temporaires acceptes ;
- les placeholders techniques a nettoyer ;
- les fallback copy definitifs et propres.

---

## 6. Repartition des responsabilites

### 6.1 Ce que doit gerer le shell

Le shell doit devenir responsable de :

- la navigation produit principale ;
- l'activation des vues majeures ;
- les banners systeme ;
- les signaux online/offline et lifecycle ;
- les transitions entre home, play, game, profile, collection, loadouts et dev.

### 6.2 Ce que doit gerer le prematch

Le prematch doit rester responsable, tant qu'il existe, de :

- la preparation immediate d'une session de combat ;
- la selection de map ;
- la selection de build ;
- les custom-room entry points encore relies au combat.

Mais il ne doit plus redevenir un pseudo-shell concurrent.

### 6.3 Ce que doivent gerer les pages standalone restantes

Une page standalone restante doit satisfaire au moins une de ces conditions :

- servir un vrai point d'entree independant ;
- repondre a une contrainte de build ou d'outillage claire ;
- exposer une surface produit impossible ou inutile a porter dans le shell.

Si aucune de ces conditions n'est vraie, la page doit etre supprimee ou absorbee.

---

## 7. Regle de cleanup recommandee

La regle doit etre explicite :

- si un morceau n'est plus reference et n'a plus de role produit, il doit disparaitre ;
- si un morceau est encore reference mais n'appartient plus a la cible, il doit etre marque comme transitoire et planifie ;
- si deux surfaces font la meme chose, une seule doit survivre ;
- si un placeholder reste visible, il doit etre soit assume produit, soit retire ;
- si une UI ancienne ne sert plus que d'archive implicite, elle ne doit pas rester dans la base active.

---

## 8. Etat cible recommande

La cible retenue pour le client est la suivante :

- une application shell comme surface principale ;
- un ecran game qui integre proprement le prematch tant qu'il est necessaire ;
- une seule version de la vue dev ;
- une politique explicite sur les pages root-level autorisees ;
- des messages de secours propres, limites et coherents ;
- aucune reference restante aux anciens flows de matchmaking supprimes ;
- aucune UI importante maintenue en double sans justification.

---

## 9. Strategie de migration recommandee

### 9.1 Etape 1 - Documenter les surfaces encore en doublon

Objectif : savoir exactement ce qui existe encore en parallele.

Travail attendu :

- lister les pages standalone encore presentes ;
- lister les vues shell equivalentes ;
- lister les scripts root-level encore reels ;
- lister les flows encore partages entre shell et prematch.

Resultat attendu :

une carte claire des zones legacy encore actives.

### 9.2 Etape 2 - Supprimer les doublons sans valeur produit

Objectif : retirer les morceaux les plus faciles a eliminer.

Travail attendu :

- supprimer les utilitaires UI non references ;
- supprimer les vieux flows deja retires du HTML ;
- supprimer les fichiers de style ou scripts devenus purement residuels ;
- supprimer les pages standalone sans valeur produit propre.

Resultat attendu :

le repo perd une premiere couche de bruit sans impact fonctionnel.

### 9.3 Etape 3 - Reserrer les zones de transition

Objectif : cadrer ce qui reste encore utile mais non cible.

Travail attendu :

- clarifier le role exact du prematch ;
- clarifier la frontiere entre page Play et flow de lancement in-game ;
- clarifier si la vue dev standalone doit survivre ou non ;
- clarifier quelles pages root-level restent legitimes.

Resultat attendu :

les zones transitoires ne sont plus confondues avec l'architecture finale.

### 9.4 Etape 4 - Aligner la base front sur la cible shell

Objectif : faire du shell la vraie structure dominante.

Travail attendu :

- absorber ce qui doit l'etre dans les vues shell ;
- retirer les dependances restantes a des pages paralleles ;
- unifier la logique de rendu documentaire ou produit quand elle existe en double ;
- limiter les points d'entree HTML a ceux qui sont encore justifies.

Resultat attendu :

la structure du repo raconte enfin le produit courant et non l'histoire complete du prototype.

---

## 10. Ce qu'il ne faut pas faire

### 10.1 Supprimer des zones de transition encore actives sans cible de remplacement

Un flow ancien mais encore branche ne doit pas etre retire juste parce qu'il a l'air vieux.

### 10.2 Garder indefiniment des doublons par prudence

Une duplication permanente finit toujours par couter plus cher que le risque de trancher.

### 10.3 Confondre placeholders produit et placeholders techniques

Une carte grisee volontairement n'est pas equivalente a un message de fallback maladroit ou a un script duplique.

### 10.4 Laisser la structure du repo diverger du produit reel

Quand le produit principal passe par le shell, le repo ne doit pas continuer a privilegier des pages paralleles devenues secondaires.

---

## 11. Risques a anticiper

### Risque 1 - supprimer une page encore utilisee implicitement

Le nettoyage doit s'appuyer sur des references reelles et pas seulement sur l'impression visuelle.

### Risque 2 - casser un flow de lancement encore branche au prematch

Le prematch n'est pas encore un reliquat mort. Il faut le traiter comme une zone de transition active.

### Risque 3 - disperser encore la logique documentaire ou produit

Si une vue dev est corrigee mais pas l'autre, on reconstitue immediatement la dette.

### Risque 4 - remettre des placeholders approximatifs apres nettoyage

Un cleanup utile doit aussi installer une regle de qualite sur les textes de secours et les valeurs par defaut.

---

## 12. Decision executable

Le prochain lot utile n'est pas une grosse refonte visuelle.

Le prochain lot utile doit etre :

- audit des pages standalone root-level encore presentes ;
- arbitrage explicite sur la survie de `dev-status` face a la vue dev shell ;
- documentation des zones de transition shell -> play -> prematch ;
- suppression continue des reliquats UI/gameplay sans responsabilite claire.

Avant ce lot, le repo garde encore des traces structurelles de plusieurs generations de client.

Apres ce lot, PROTOTYPE-0 commence a avoir une base front plus nette :

- une navigation produit principale claire ;
- moins de doublons ;
- moins de bruit historique ;
- une meilleure lisibilite pour les prochaines refontes.

---

## 13. Conclusion

La bonne refonte legacy UI/gameplay pour PROTOTYPE-0 n'est pas une suppression aveugle de vieux fichiers.

La bonne refonte est une clarification progressive de ce qui constitue le client cible :

- un shell principal ;
- un flow de lancement explicite ;
- des pages standalone seulement si elles sont justifiees ;
- aucune duplication importante sans raison ;
- et une base front qui raconte enfin le produit courant plutot que l'accumulation de ses etapes precedentes.

Le critere de succes final est simple :

quand on lit le repo client, on comprend immediatement quelle UI est la vraie, quels flows sont encore transitoires, et quels morceaux legacy ont deja ete sortis du chemin.