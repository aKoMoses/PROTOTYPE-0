# Refonte PWA Mobile - PROTOTYPE-0 vers un vrai jeu jouable sur telephone

Date : 2026-04-12

## Objectif

Ce document decrit une refonte produit et technique pour faire evoluer PROTOTYPE-0 d'une application web responsive vers une vraie PWA mobile installable et jouable confortablement sur telephone.

L'objectif n'est pas seulement d'ajouter un manifest et un bouton Installer.

L'objectif est d'obtenir une experience mobile coherente dans laquelle :

- le jeu peut etre installe sur l'ecran d'accueil ;
- l'application s'ouvre comme une app, pas comme un simple site dans un onglet ;
- l'experience de jeu est pensee en mode paysage ;
- les controles sont jouables au pouce avec deux joysticks virtuels ;
- les sorts et actions critiques sont accessibles sans gymnastique des mains ;
- les ecrans produit restent utilisables sur telephone ;
- les performances restent suffisantes sur des appareils mobiles reels ;
- certains modes peuvent continuer a marcher hors ligne ;
- les modes reseau restent reserves a une connexion active.

Ce document ne contient pas de code.
Il pose les decisions techniques, les contraintes UX et les etapes de mise en oeuvre pour transformer le projet en une vraie experience mobile jouable.

---

## 1. Constat de depart

Aujourd'hui, PROTOTYPE-0 est deja consultable sur mobile, mais il reste structure comme une application web desktop d'abord.

En pratique :

- l'application est responsive sur plusieurs zones d'UI ;
- le jeu tourne dans le navigateur mobile ;
- une premiere couche tactile existe deja pour deplacer le joueur et reutiliser une partie des interactions ;
- l'architecture de rendu reste pensee avant tout comme une page web canvas ;
- il n'existe pas encore de stack PWA dediee ;
- il n'existe pas encore de manifeste d'installation produit ;
- il n'existe pas encore de service worker organise pour le cache offline ;
- l'experience telephone n'est pas encore posee comme une cible produit autonome ;
- l'ergonomie de combat n'est pas encore definie autour des pouces et des contraintes de prise en main mobile.

Autrement dit :

le projet est mobile-compatible par adaptation, mais pas encore mobile-native dans sa logique produit.

La limite principale est simple :

responsive ne suffit pas pour faire un bon jeu telephone.

Un jeu jouable sur mobile a besoin de decisions explicites sur :

- l'orientation ;
- l'occupation de l'ecran ;
- la taille minimale des cibles tactiles ;
- le placement des commandes sous les pouces ;
- la gestion de la barre d'adresse et du mode standalone ;
- les performances GPU/CPU ;
- l'audio mobile ;
- le comportement hors ligne ;
- la reprise de session ;
- les interruptions systeme.

---

## 2. Decision produit et technique

La bonne cible pour ce projet est la suivante :

- une vraie PWA installable comme application mobile ;
- une experience de jeu ciblee sur telephone en mode paysage ;
- un HUD de combat pense pour deux pouces ;
- un mode offline reserve a l'entrainement et aux contenus solo compatibles ;
- les modes reseau reserves a une connexion active ;
- une architecture qui conserve la base web actuelle mais ajoute une couche mobile explicite.

En une phrase :

PROTOTYPE-0 doit devenir une application web installable qui se comporte comme un vrai jeu mobile paysage, sans cesser d'etre le client web principal du projet.

---

## 3. Principe directeur

La refonte PWA mobile ne doit pas etre un skin CSS ajoute a la fin.

Le bon chemin est :

1. conserver le client Vite web comme base unique ;
2. ajouter une couche produit PWA explicite ;
3. ajouter une couche UX mobile explicite ;
4. separer clairement les besoins desktop et telephone ;
5. traiter le combat mobile comme un vrai schema de controle, pas comme une simple adaptation tactile.

Autrement dit :

- desktop et mobile partagent le meme jeu ;
- la PWA fournit l'enveloppe d'application ;
- la couche mobile fournit l'ergonomie reelle ;
- le gameplay doit savoir consommer proprement des inputs tactiles continus.

---

## 4. Cible produit recommandee

Le flux cible mobile doit ressembler a ceci :

1. le joueur ouvre l'application depuis l'ecran d'accueil ;
2. l'application se lance en mode standalone sans chrome navigateur parasite ;
3. si le telephone est en portrait, une surcouche demande le passage en paysage ;
4. une fois en paysage, le shell produit s'adapte a l'espace mobile ;
5. le joueur peut naviguer dans les menus avec de vraies cibles tactiles ;
6. s'il part en mode entrainement ou solo compatible, le jeu peut continuer meme sans reseau si les assets sont deja caches ;
7. s'il part en mode reseau, l'application exige une connexion active ;
8. en combat, deux joysticks apparaissent dans les coins bas ;
9. les boutons de sorts et actions sont places a portee des pouces ;
10. l'interface reduit au minimum les elements non indispensables en pleine partie ;
11. la fin de partie renvoie vers une UI mobile lisible et facile a manipuler ;
12. la reprise d'application restaure proprement l'etat produit ou relance une session de jeu de maniere controlee.

Ce flux doit faire disparaitre l'impression de jouer a un site responsive en paysage.

---

## 5. Pourquoi une PWA ne se resume pas a un manifest

Une PWA utile pour ce projet doit couvrir plusieurs sujets a la fois :

- installation ;
- mode standalone ;
- gestion du cache ;
- chargement rapide ;
- support offline partiel ;
- comportement fiable au retour depuis l'arriere-plan ;
- ergonomie plein ecran ;
- icones, splash screen et metadata adaptees ;
- routage et reprise d'etat robustes.

Ajouter seulement :

- un `manifest.webmanifest` ;
- un `theme-color` ;
- un service worker minimal ;

ne suffira pas pour produire une bonne experience de jeu mobile.

La vraie difficulte est ailleurs :

- rendre le combat lisible en petit ecran ;
- rendre les controles fiables au pouce ;
- gerer la densite d'UI ;
- tenir les performances ;
- survivre au cycle de vie mobile.

---

## 6. Cible UX du combat mobile

La cible de controle mobile a ete clarifiee ainsi :

- orientation paysage obligatoire pendant le combat ;
- joystick gauche pour le deplacement ;
- joystick droit pour la visee ;
- tir automatique lorsque la visee engage une action de combat compatible ;
- boutons de sorts et actions critiques disposes au plus pres des pouces ;
- aucun bouton vital ne doit obliger a lacher le joystick principal trop longtemps.

### 6.1 Repartition cible des commandes

Le schema recommande est le suivant :

- coin bas gauche : joystick de deplacement ;
- zone gauche proche du pouce gauche : dash ou action defensive rapide si necessaire ;
- coin bas droit : joystick de visee ;
- arc autour du pouce droit : sorts principaux Q, E, F adaptes a l'equivalent mobile ;
- haut droit ou zone exterieure du cluster droit : ultimate ou reactor core ;
- haut gauche : pause, menu, options secondaires hors zone de friction ;
- centre bas : aucune commande critique permanente si elle masque le combat.

### 6.2 Regles ergonomiques minimales

Les contraintes minimales doivent etre :

- boutons tactiles suffisamment larges pour un pouce reel ;
- ecart suffisant entre deux actions destructives ;
- lecture instantanee des cooldowns ;
- retour visuel clair sur pression, maintien, cooldown et indisponibilite ;
- aucun texte trop petit en pleine partie ;
- aucune dependance a un hover ou a un clic precis type desktop.

### 6.3 Tir automatique

Le choix cible valide ici est :

- le joueur dirige la visee avec le joystick droit ;
- le tir principal peut partir automatiquement selon le type d'arme et les regles du mode ;
- les actions qui demandent un vrai declenchement discret gardent un bouton dedie ;
- le systeme doit rester coherent avec la version desktop sans casser l'equilibrage.

Cela impose une decision de design :

le mobile ne doit pas simplement copier la souris. Il doit definir sa propre grammaire de combat tout en restant compatible avec la logique de jeu.

---

## 7. Repartition des responsabilites

### 7.1 Ce que doit gerer la couche PWA

La couche PWA doit devenir responsable de :

- l'installation ;
- le manifest ;
- les icones ;
- le mode standalone ;
- la strategie de cache ;
- la mise a jour des assets ;
- le support offline partiel ;
- les ecrans de chargement et de revalidation ;
- la detection de version et de refresh de l'application.

### 7.2 Ce que doit gerer la couche mobile UX

La couche mobile UX doit devenir responsable de :

- le verrouillage logique en paysage pour le gameplay ;
- les overlays portrait vers paysage ;
- le HUD tactile ;
- les joysticks virtuels ;
- les clusters de boutons au pouce ;
- la taille des cibles tactiles ;
- la reduction et priorisation des panneaux en combat ;
- la prise en compte des safe areas et des encoches.

### 7.3 Ce que doit gerer le gameplay

Le gameplay doit rester responsable de :

- l'interpretation des intentions de deplacement ;
- l'interpretation des intentions de visee ;
- l'activation des sorts ;
- l'arbitrage entre input desktop, gamepad et tactile ;
- le maintien d'une logique de combat unique autant que possible.

### 7.4 Ce que doit gerer le backend

Le backend ne change pas de role a cause de la PWA.

Il reste responsable de :

- l'authentification ;
- les profils ;
- la progression ;
- les loadouts ;
- les resultats de match ;
- les rooms et combats reseau.

La PWA ne doit pas dupliquer la logique metier serveur.

---

## 8. Etat cible des usages offline et online

La cible retenue est volontairement hybride.

### 8.1 Ce qui doit pouvoir marcher hors ligne

Si les assets sont deja caches localement, les experiences suivantes doivent pouvoir continuer a fonctionner hors ligne :

- ouverture de l'application ;
- navigation de base dans le shell si les donnees critiques sont disponibles en cache ;
- entrainement ;
- eventuellement certains contenus solo qui ne dependent pas du backend temps reel.

### 8.2 Ce qui doit rester strictement online

Doivent rester reserves a une connexion active :

- authentification distante quand aucune session valide n'est deja presente ;
- synchronisation de profil ;
- loadouts distants si aucune copie locale exploitable n'est disponible ;
- custom games ;
- matchmaking ;
- combats multijoueur ;
- progression persistante post-match.

### 8.3 Regle produit

La regle produit doit etre explicite dans l'interface :

- offline : entrainement et contenus compatibles ;
- online : tout ce qui engage le compte, la progression distante ou le reseau temps reel.

Le joueur ne doit pas decouvrir trop tard qu'un mode reseau est indisponible.

---

## 9. Contraintes techniques specifiques au telephone

Un jeu telephone en PWA ne vit pas dans les memes conditions qu'un desktop.

Il faut penser :

- CPU plus faible ;
- chauffe ;
- throttling ;
- memoire plus limitee ;
- reprises apres mise en arriere-plan ;
- audio parfois suspendu ;
- taille d'ecran reduite ;
- safe areas ;
- barres systeme fluctuantes ;
- scroll, zoom et gestes navigateurs a neutraliser proprement.

La cible doit donc imposer :

- une densite d'UI plus faible ;
- un HUD tres priorise ;
- un canvas bien dimensionne ;
- une maitrise stricte des overlays ;
- des assets charges intelligemment ;
- une surveillance des performances mobiles en conditions reelles.

---

## 10. Impacts sur le code existant

### 10.1 Ce qui peut rester proche de l'existant

- la base Vite ;
- le client web comme application principale ;
- la logique de rendu canvas ;
- une partie des etats de jeu ;
- une partie de la navigation shell ;
- les services Supabase et Colyseus existants ;
- la premiere couche tactile deja presente pour le mouvement.

### 10.2 Ce qui doit etre refactorise

- la conception du HUD de combat ;
- la gestion tactile de la visee ;
- la disposition des actions de combat ;
- l'ergonomie des menus sur telephone ;
- la hierarchie des overlays ;
- la gestion des reprises d'application ;
- les styles responsive qui restent trop proches d'une logique desktop compacte.

### 10.3 Ce qui doit etre ajoute

Il manque aujourd'hui des briques structurantes :

- un manifest PWA ;
- des icones d'application dediees ;
- un service worker propre ;
- une strategie de cache versionnee ;
- une detection d'installation et de mode standalone ;
- une couche d'orientation produit ;
- une couche de HUD tactile dediee au combat mobile ;
- une gestion offline/online explicite ;
- une politique de mise a jour de l'application.

---

## 11. Architecture applicative cible

L'architecture cible doit etre pensee comme quatre couches qui cooperent :

### 11.1 Couche 1 : application web principale

Role : logique applicative, rendu et navigation.

### 11.2 Couche 2 : enveloppe PWA

Role : installation, cache, mode standalone, reprise et mise a jour.

### 11.3 Couche 3 : experience mobile tactile

Role : orientation, HUD mobile, joysticks, boutons, safe areas, lisibilite.

### 11.4 Couche 4 : backend existant

Role : compte, persistence, multijoueur, combat autoritatif, historique.

Le point important est que la couche PWA et la couche mobile ne doivent pas etre confondues.

- la PWA rend l'application installable et plus robuste ;
- la couche mobile rend le jeu vraiment jouable au telephone.

---

## 12. Cible d'interface mobile detaillee

### 12.1 Navigation produit

Sur telephone, la navigation doit etre simplifiee et hierarchisee.

Le shell cible doit privilegier :

- grandes cibles tactiles ;
- moins de panneaux simultanes ;
- moins de details visibles d'un coup ;
- plus de navigation par ecrans clairs que par micro-zones cliquables.

### 12.2 Ecran de jeu

En combat, l'ecran doit privilegier :

- l'aire de jeu au centre ;
- les HP, cooldowns et score en bordure haute ;
- les joysticks et boutons en bordure basse ;
- un maximum de transparence pour les elements tactiles ;
- une lisibilite immediate du personnage, des projectiles et des impacts.

### 12.3 Etat portrait

Le portrait ne doit pas essayer de faire tourner le vrai combat.

La bonne cible est :

- afficher un ecran d'interruption ou de guidage ;
- demander de pivoter le telephone ;
- suspendre ou ralentir la partie selon le mode ;
- eviter toute illusion de jouabilite reelle en portrait.

### 12.4 Etats systeme

Il faut definir explicitement des ecrans pour :

- lancement hors ligne ;
- perte de connexion ;
- retour depuis l'arriere-plan ;
- application obsolescente avec nouvelle version disponible ;
- cache en cours de mise a jour ;
- installation proposee ou deja active.

---

## 13. Service worker et strategie de cache

La strategie de cache ne doit pas etre improvisee.

### 13.1 Ce qui doit etre pre-cache

Le pre-cache doit couvrir au minimum :

- shell HTML necessaire ;
- bundles JS/CSS de base ;
- assets critiques d'interface ;
- police et icones indispensables ;
- ecrans de lancement ;
- assets necessaires a l'entrainement si l'objectif offline doit etre tenu.

### 13.2 Ce qui doit etre gere plus prudemment

Doivent etre geres avec plus de prudence :

- gros assets audio ;
- lots d'assets lourds peu utilises ;
- donnees distantes volatiles ;
- contenus de match reseau ;
- payloads lies au compte.

### 13.3 Regle de mise a jour

La regle doit etre simple :

- une version de build correspond a une version de cache ;
- la PWA doit pouvoir detecter qu'une version plus recente existe ;
- l'utilisateur doit pouvoir recharger proprement ;
- il faut eviter les melanges de vieux JS et de nouveaux assets.

---

## 14. Audio, performance et batterie

Sur mobile, la qualite percue depend autant de la tenue technique que du gameplay.

La cible minimale doit etre :

- demarrage rapide ;
- bonne reactivite des inputs tactiles ;
- framerate stable sur des appareils moyens ;
- reduction du travail inutile hors ecran ;
- maitrise des effets visuels les plus chers ;
- reprise audio fiable apres interruption ;
- profil de consommation acceptable en session de plusieurs minutes.

Cela impose de penser tres tot a :

- la resolution de rendu reelle ;
- la densite d'effets ;
- le nombre d'entites visibles ;
- le poids du chargement initial ;
- les degradations qualitatives acceptables sur mobile.

---

## 15. Etapes de refonte recommandees

### Point d'etape au 2026-04-12

La base actuelle n'est pas vide.

Ce qui existe deja dans la branche actuelle :

- client Vite unique qui peut servir de base a la PWA ;
- experience mobile responsive partielle ;
- premiers inputs tactiles deja presents pour une partie du gameplay ;
- architecture compte, progression et multijoueur deja en cours de structuration ;
- canvas de jeu deja unifie entre les plateformes.

Ce qui manque encore pour parler d'une vraie application mobile jouable :

- enveloppe PWA complete ;
- orientation produit claire ;
- HUD tactile de combat abouti ;
- politique offline/online explicite ;
- optimisation mobile systematique ;
- UX mobile dediee sur les ecrans critiques.

### Etape 1 - Installer la base PWA

Objectif : obtenir une application installable et lancable proprement sur telephone.

Travail attendu :

- ajouter un manifest ;
- definir les icones et metadata ;
- activer un service worker ;
- faire tourner l'application en mode standalone ;
- verifier l'installation sur iPhone et Android.

Resultat attendu :

le projet peut etre installe sur l'ecran d'accueil et s'ouvrir comme une app.

### Etape 2 - Definir la couche mobile produit

Objectif : sortir d'une simple responsive adaptation.

Travail attendu :

- definir les breakpoints produit mobile ;
- simplifier les vues shell sur petit ecran ;
- grossir les cibles tactiles ;
- revoir les overlays et panneaux ;
- gerer les safe areas.

Resultat attendu :

les menus deviennent vraiment utilisables au doigt sur telephone.

### Etape 3 - Imposer le mode paysage de gameplay

Objectif : eviter une fausse jouabilite en portrait.

Travail attendu :

- detecter l'orientation ;
- afficher un ecran portrait vers paysage ;
- definir le comportement pause ou blocage selon le mode ;
- verifier la lisibilite en plusieurs ratios telephone.

Resultat attendu :

le combat ne se lance plus dans un cadre incoherent pour le pouce et la visibilite.

### Etape 4 - Construire le vrai HUD tactile de combat

Objectif : rendre le combat jouable a deux pouces.

Travail attendu :

- stabiliser le joystick gauche de deplacement ;
- creer le joystick droit de visee ;
- cadrer le tir automatique ;
- positionner les boutons de sorts autour des pouces ;
- definir les retours visuels et cooldowns tactiles ;
- gerer les erreurs de pression et les zones mortes.

Resultat attendu :

un joueur peut se deplacer, viser, tirer et lancer ses sorts sans quitter le combat des yeux.

### Etape 5 - Rendre les modes solo compatibles offline

Objectif : obtenir une vraie valeur mobile meme sans reseau constant.

Travail attendu :

- mettre en cache le shell et les assets critiques ;
- definir les modes autorises hors ligne ;
- gerer les etats de session locale ;
- afficher clairement ce qui reste indisponible offline.

Resultat attendu :

l'entrainement et les experiences solo compatibles restent jouables sans connexion.

### Etape 6 - Durcir le cycle de vie mobile

Objectif : supporter les interruptions reelles d'un telephone.

Travail attendu :

- gerer la mise en arriere-plan ;
- gerer la reprise ;
- gerer la suspension audio ;
- gerer la perte et le retour reseau ;
- gerer les mises a jour applicatives.

Resultat attendu :

l'application se comporte comme une vraie app mobile et pas comme un onglet fragile.

### Etape 7 - Optimiser la performance mobile

Objectif : tenir des sessions de jeu reelles sur appareils moyens.

Travail attendu :

- mesurer les performances sur telephones reels, pas seulement dans le responsive mode du desktop ;
- fixer une cible prioritaire explicite : Android milieu de gamme 2022-2024, avec verification croisee sur iPhone recent ;
- tenir un budget minimal clair : 30 FPS stables sur appareils moyens en session de jeu reelle ;
- instrumenter la frame time, les chutes de FPS et les paliers de qualite avant d'optimiser a l'aveugle ;
- plafonner le device pixel ratio mobile avant toute refonte plus lourde du rendu ;
- introduire un mode de qualite adaptatif qui degrade d'abord la resolution de rendu, puis certains effets decoratifs si le budget explose ;
- limiter les couts de rendu les plus chers en priorite : fill rate canvas, halos, pulses, overlays alpha repetes, decor purement cosmetique ;
- durcir le chargement initial pour que le premier combat reste rapide a ouvrir sur reseau mobile ;
- corriger les regressions de chauffe et de batterie sur des sessions de plusieurs minutes.

Premier lot de quick wins recommande :

- ajouter une telemetrie legere de frame time exploitable sur vrai device ;
- plafonner le rendu mobile a un DPR effectif raisonnable meme si le telephone annonce un DPR plus eleve ;
- introduire trois paliers de qualite simples : high, medium, low ;
- faire baisser automatiquement la qualite si la frame time moyenne depasse durablement le budget ;
- couper d'abord le superflu decoratif avant de toucher a la lisibilite du combat.

Protocole de mesure minimal :

- 3 minutes de training ;
- 3 minutes de duel charge ;
- 3 minutes de survie chargee ;
- relever FPS moyen, sensation de fluidite tactile, chauffe percue et stabilite de la batterie ;
- verifier que la qualite adaptative ne change pas de palier en boucle.

Resultat attendu :

- le jeu reste jouable et stable sur une cible mobile credible ;
- la cible Android moyenne tient 30 FPS stables avec une degradation visuelle acceptable ;
- le rendu mobile degrade sa qualite avant de laisser s'effondrer la jouabilite ;
- les sessions de plusieurs minutes ne provoquent pas une chauffe ou une consommation manifestement hors cible.

---

## 16. Ordre de priorite recommande

L'ordre le plus rationnel pour ce projet est :

1. base PWA installable ;
2. simplification produit mobile du shell ;
3. verrouillage logique en paysage pour le gameplay ;
4. vrai HUD tactile avec deux joysticks et sorts au pouce ;
5. offline training et solo compatible ;
6. gestion des interruptions et de la reprise ;
7. optimisation performance mobile.

Il ne faut pas commencer par un service worker sophistique si le combat n'est pas encore vraiment jouable au pouce.

Le coeur du succes mobile ici n'est pas seulement technique.
Il est d'abord ergonomique.

---

## 17. Risques a anticiper

### Risque 1 - confondre responsive et mobile jouable

Une interface qui se replie n'est pas automatiquement une bonne interface de jeu telephone.

### Risque 2 - copier le schema souris-clavier sur touch

Le tactile demande une logique propre.
Un simple portage des commandes desktop produira une experience mediocre.

### Risque 3 - surcharger l'ecran

Sur mobile, trop d'UI tue la lisibilite du combat.

### Risque 4 - mal gerer le offline

Un faux mode offline qui casse silencieusement sera pire qu'une limitation clairement affichee.

### Risque 5 - ignorer le cycle de vie mobile

Les interruptions, reprises et pertes reseau sont normales sur telephone.
Le jeu doit etre pense pour elles.

### Risque 6 - sous-estimer la performance reelle

Un build qui tourne bien sur desktop responsive peut s'effondrer sur smartphone a cause de la chauffe, du GPU ou de la memoire.

---

## 18. Decision executable

Le premier lot utile n'est pas de faire tout le mobile d'un coup.

Le prochain lot executable doit etre :

- ajout de la base PWA installable ;
- definition du comportement standalone ;
- overlay portrait vers paysage ;
- specification du HUD tactile de combat ;
- joystick droit de visee ;
- schema de tir automatique ;
- placement des sorts autour des pouces ;
- cadrage offline limite a l'entrainement et aux contenus solo compatibles.

Avant ce lot, PROTOTYPE-0 reste surtout un site jouable sur mobile.

Apres ce lot, PROTOTYPE-0 commence a devenir une vraie application de jeu telephone :

- installable ;
- ouvrable comme une app ;
- pensee pour le paysage ;
- jouable aux pouces ;
- partiellement exploitable hors ligne.

---

## 19. Conclusion

La bonne refonte mobile pour PROTOTYPE-0 n'est pas seulement :

- rendre quelques panneaux plus petits ;
- ajouter un manifest ;
- declarer que le jeu marche deja sur telephone.

La bonne refonte est une architecture mobile complete avec :

- une enveloppe PWA ;
- une UX mobile explicite ;
- un combat pense pour deux pouces ;
- une orientation paysage assumee ;
- un offline limite mais utile ;
- une robustesse de vraie application mobile.

Le critere de succes final est simple :

un joueur installe PROTOTYPE-0 sur son telephone, ouvre l'application en paysage, navigue facilement dans les menus, lance un combat, joue confortablement avec deux joysticks et des boutons de sorts au pouce, puis retrouve une experience fluide et credible de vrai jeu mobile.
