# Refonte Archi - PROTOTYPE-0 vers un vrai multijoueur temps reel

Date : 2026-04-12

## Objectif

Ce document decrit une refonte d'architecture pour faire evoluer PROTOTYPE-0 d'un prototype navigateur local vers un jeu multijoueur temps reel jouable a plusieurs.

L'objectif n'est pas seulement d'ajouter du reseau. L'objectif est d'obtenir une architecture coherente dans laquelle :

- le joueur a un vrai compte ;
- sa progression est persistante ;
- le lobby et la file d'attente sont synchronises ;
- le combat est gere par un serveur autoritatif ;
- le client web reste rapide et simple a faire evoluer.

Ce document ne contient pas de code. Il pose les decisions techniques, les responsabilites de chaque brique et les etapes de mise en oeuvre pour obtenir un jeu multi temps reel qui tourne proprement.

---

## 1. Constat de depart

Aujourd'hui, PROTOTYPE-0 est structure comme un jeu solo local avec des couches de persistence navigateur :

- la couche compte front est deja branchee sur Supabase pour l'inscription, la connexion et le chargement du profil ;
- la migration SQL de base pour `profiles` et `player_progression` est preparee mais pas encore appliquee sur un projet Supabase cible ;
- la progression vit en `localStorage` ;
- les loadouts vivent en `localStorage` ;
- la reprise de session vit en `sessionStorage` ;
- le profil lit deja les donnees serveur de base, mais l'historique de match et la progression complete ne sont pas encore remotes ;
- le matchmaking est une machine d'etat locale sans reseau reel ;
- le gameplay tourne entierement dans le client.

Cette base est bonne pour un prototype jouable, mais elle n'est pas suffisante pour un vrai multijoueur competitif ou coop temps reel.

La limite la plus importante est simple : le client controle actuellement trop de choses.

Dans un vrai multi temps reel :

- le client ne doit pas decider seul du resultat du match ;
- le client ne doit pas etre la source de verite des positions, collisions, degats et victoires ;
- le client ne doit pas pouvoir s'attribuer lui-meme de l'XP ou falsifier un score.

---

## 2. Decision d'architecture

La bonne architecture cible pour ce projet est la suivante :

- Supabase pour l'identite, les comptes, la persistence, la progression, les profils, les loadouts, l'historique et une partie du lobby produit ;
- Colyseus pour le serveur de match temps reel autoritatif ;
- le client web Vite pour le rendu, l'input, l'UI, la prediction locale eventuelle et la navigation produit.

En une phrase :

Supabase gere la vie du joueur hors combat, Colyseus gere la verite du combat.

---

## 3. Repartition des responsabilites

### 3.1 Ce que doit gerer le client web

Le client doit rester responsable de :

- l'affichage ;
- les menus ;
- les transitions ecran ;
- la collecte des inputs ;
- la presentation du HUD ;
- les animations locales ;
- la navigation produit ;
- le cache local de confort ;
- la prediction visuelle si elle devient necessaire plus tard.

Le client ne doit pas devenir la source de verite du combat en ligne.

### 3.2 Ce que doit gerer Supabase

Supabase doit devenir responsable de :

- l'authentification ;
- les comptes permanents ;
- le profil joueur ;
- la progression ;
- les loadouts persistants ;
- l'historique de matchs ;
- les stats de profil ;
- les reglages synchronisables entre appareils ;
- la file d'attente et le lobby produit si vous voulez les suivre durablement ;
- les ecritures sensibles post-match via des fonctions serveur.

### 3.3 Ce que doit gerer Colyseus

Colyseus doit devenir responsable de :

- la creation des salles de match ;
- l'entree des joueurs dans une partie ;
- la simulation serveur ;
- l'etat autoritatif du round ;
- les positions ;
- les projectiles ;
- les collisions ;
- les degats ;
- les morts ;
- le score du match ;
- les deconnexions et reconnexions pendant le combat ;
- la cloture propre d'une partie ;
- le renvoi d'un resultat fiable vers Supabase a la fin.

---

## 4. Pourquoi Supabase seul ne suffit pas

Supabase est tres bon pour :

- les comptes ;
- la base de donnees ;
- les fonctions serveur ;
- le stockage ;
- les mises a jour realtime legeres ;
- la presence de lobby ;
- les notifications produit.

Mais Supabase n'est pas la bonne brique pour porter un combat d'arene temps reel tick par tick.

Les raisons sont structurelles :

- le combat a besoin d'une boucle de simulation continue ;
- les echanges reseau doivent etre tres frequents et tres courts ;
- il faut gerer la latence, la reconnexion, la desynchronisation et l'arbitrage serveur ;
- il faut eviter de reposer sur des ecritures base de donnees pour des evenements de gameplay a haute frequence.

Colyseus est adapte a ce besoin parce qu'il est pense pour des rooms de jeu autoritatives avec synchronisation d'etat et gestion de sessions de match.

---

## 5. Principe directeur

La refonte ne doit pas etre une destruction du prototype actuel.

Le bon chemin est :

1. conserver le client existant comme base de rendu et d'UI ;
2. extraire progressivement les responsabilites metier hors du navigateur ;
3. brancher Supabase sur tout ce qui concerne la vie du joueur ;
4. brancher Colyseus sur tout ce qui concerne la vie du match ;
5. faire cohabiter les deux mondes proprement.

Autrement dit :

- hors match, le joueur parle surtout a Supabase ;
- au moment d'entrer en partie, il bascule vers Colyseus ;
- a la fin de la partie, Colyseus produit un resultat qui alimente Supabase.

---

## 6. Cible produit recommandee

Le flux cible doit ressembler a ceci :

1. le joueur arrive sur le jeu ;
2. il cree son compte ou se connecte a son compte Supabase ;
3. le client charge son profil, sa progression et ses loadouts ;
4. le joueur ouvre le menu Play via un modal produit dedie ;
5. il choisit une famille de jeu avec une identite visuelle claire : mode classique ou mode survie ;
6. depuis le mode classique, il ouvre soit Versus IA, soit Custom Games, soit Matchmaking ;
7. selon le sous-flux choisi, le client entre dans une file, un lobby, ou une room custom ;
8. quand un match est pret, le client recupere les informations d'acces au serveur Colyseus ;
9. le joueur rejoint une room Colyseus ;
10. le combat tourne de facon autoritative sur Colyseus ;
11. a la fin, le resultat du match est valide et ecrit dans Supabase ;
12. le profil est mis a jour ;
13. le joueur retourne au lobby, a la liste des rooms, ou relance une partie.

Ce flux ferme enfin la boucle complete :

compte -> loadout -> lobby -> match -> resultat -> progression -> profil -> nouveau match

### 6.1 Cible UX du menu Play

La refonte du bouton Play doit commencer par une refonte produit nette de l'entree en jeu.

Le comportement cible est le suivant :

- un clic sur Play ouvre un modal dedie plutot qu'un enchainement de panneaux techniques ;
- le modal expose deux grands modes avec une vraie identite visuelle distincte : mode classique et mode survie ;
- une entree secondaire `Training Tool` reste visible en bas du modal comme outil a part, et non comme un mode principal de la meme importance ;
- le mode classique devient la porte d'entree des experiences PvE/PvP standard ;
- le mode survie garde sa propre identite produit et son propre habillage, meme s'il peut continuer a reutiliser une partie de la techno actuelle ;
- l'objectif de cette refonte est de clarifier la lecture du produit avant meme d'attaquer la couche reseau complete.

Le contenu cible du mode classique doit etre :

- `Versus IA` ;
- `Custom Games` ;
- `Matchmaking`.

Contraintes de la premiere phase produit :

- `Matchmaking` est visible mais grise tant que le backend de file et de match reel n'est pas livre ;
- `Versus IA` reutilise le mode actuel avec les formats 1v1 et 2v2 contre l'IA ;
- `Custom Games` devient le premier vrai point d'entree du multijoueur social avant le matchmaking automatique.

Le flux cible de `Custom Games` doit etre pense comme un navigateur de rooms :

- le joueur voit la liste des rooms creees par les autres joueurs ;
- il peut creer sa propre room ;
- lors de la creation, il choisit le format 1v1 ou 2v2 ;
- il peut completer la room avec des bots avant ou pendant l'attente des joueurs humains ;
- il peut definir la difficulte des bots ;
- les autres joueurs peuvent rejoindre la room ouverte ;
- la room sert ensuite de sas produit avant l'entree dans la room de combat Colyseus.

Cette cible implique une separation produit explicite :

- le modal Play organise les intentions de jeu ;
- le lobby custom organise les participants et les regles de session ;
- la room Colyseus execute le combat ;
- le matchmaking automatique viendra plus tard, sans bloquer la refonte du menu ni l'existence des custom games.

---

## 7. Etat cible des donnees

### 7.1 Donnees Supabase

Supabase doit contenir les donnees durables :

- profils ;
- progression ;
- historique de matchs ;
- loadouts ;
- preferences ;
- statut du compte ;
- eventuellement file d'attente et lobby si vous voulez une trace durable et observable.

### 7.2 Donnees Colyseus

Colyseus doit contenir les donnees volatiles du match :

- joueurs presents dans la room ;
- etat courant du round ;
- positions et trajectoires ;
- HP ;
- cooldowns ;
- projectiles ;
- timers de manche ;
- score live ;
- statut de reconnexion.

### 7.3 Donnees locales navigateur

Le navigateur garde uniquement :

- le cache de confort ;
- certains reglages locaux ;
- la reprise de session d'interface si utile ;
- l'etat de presentation.

La logique critique ne doit pas dependre de ce stockage local.

---

## 8. Authentification et identite

La meilleure approche pour ce projet est maintenant d'imposer un compte permanent des l'entree dans le jeu.

Pourquoi :

- vous obtenez tout de suite une identite stable et durable ;
- il n'y a pas de migration invite vers compte a gerer ensuite ;
- la progression, les loadouts et l'historique sont rattaches des le debut au bon compte ;
- les futurs usages multi, social et competitif reposent sur une base plus propre ;
- le support, la moderation et la recuperation de compte sont plus simples a penser.

Le cycle recommande est :

1. le joueur cree un compte ou se connecte ;
2. Supabase devient immediatement la source d'identite du joueur ;
3. le profil, la progression et les loadouts sont initialises sur cette base ;
4. Colyseus reutilise ensuite cette identite pour autoriser l'entree en match.

Colyseus ne doit pas inventer sa propre identite produit. Il doit s'appuyer sur l'identite fournie par Supabase.

En clair :

- Supabase identifie le joueur ;
- Colyseus fait confiance a un jeton ou une validation issue de Supabase ;
- le serveur de match sait qui joue sans avoir a gerer un systeme de compte parallele.

---

## 9. Lobby et matchmaking

Le matchmaking doit etre pense en deux couches.

Dans la refonte produit demandee, il faut meme distinguer trois objets differents :

- le modal Play, qui sert d'aiguillage UX ;
- le lobby produit, qui sert a preparer une session ;
- la room de combat, qui sert a jouer.

Le modal Play ne doit pas porter la logique temps reel. Il expose simplement les branches `Classique`, `Survie` et `Training Tool`, puis redirige vers le bon sous-flux.

Dans la premiere phase, la branche `Classique` doit elle-meme se diviser en trois entrees :

- `Versus IA` pour reutiliser les formats actuels 1v1 et 2v2 contre des bots ;
- `Custom Games` pour les rooms visibles et rejoignables par les autres joueurs ;
- `Matchmaking` comme entree future, presente dans l'UI mais inactive tant que la file reseau n'existe pas.

### 9.1 Couche produit

Cette couche peut vivre majoritairement autour de Supabase.

Elle couvre :

- l'ouverture du modal Play et le choix de la famille de mode ;
- entrer en file ;
- annuler la file ;
- afficher un statut de recherche ;
- assembler un groupe ;
- lister les rooms custom ouvertes ;
- creer une room custom ;
- permettre de rejoindre une room custom ;
- choisir un format 1v1 ou 2v2 pour une room custom ;
- configurer des bots supplementaires ;
- definir leur difficulte ;
- gerer la selection de map ou de mode ;
- confirmer que les joueurs sont prets ;
- enregistrer un lobby exploitable par l'interface.

### 9.2 Couche combat

Cette couche commence au moment ou le match est vraiment lance.

Elle couvre :

- l'allocation d'une room ;
- la connexion des joueurs au serveur Colyseus ;
- la synchronisation de l'etat de combat ;
- la gestion des deconnexions pendant la partie ;
- la fermeture de la room une fois le match termine.

La frontiere entre les deux couches doit etre explicite :

Supabase prepare le match, Colyseus execute le match.

Dans ce cadre, `Custom Games` doit etre considere comme le premier vrai lobby reseau a construire. `Matchmaking` peut rester en attente tant que cette boucle n'est pas stable.

---

## 10. Resultat de match et anti-triche minimale

Le point central de toute l'architecture est la validation de fin de match.

La regle a tenir est la suivante :

- le client ne declare pas le resultat final ;
- Colyseus produit le resultat du match ;
- Supabase persiste le resultat et met a jour la progression ;
- le client ne fait que refleter cet etat final.

Ce principe ne supprime pas toute triche possible, mais il elimine les failles les plus grossieres :

- faux score local ;
- fausse victoire ;
- faux gain d'XP ;
- faux historique.

---

## 11. Impacts sur le code existant

### 11.1 Ce qui peut rester proche de l'existant

- le rendu canvas ;
- l'UI shell ;
- la navigation ;
- une partie du HUD ;
- une grande partie des assets et du contenu ;
- les structures de build/loadout cote presentation.

### 11.2 Ce qui doit etre refactorise

- l'auth mockee ;
- la progression stockee seulement en local ;
- le profil mocke ;
- l'historique de match ;
- le matchmaking purement local ;
- le fait que le client pilote seul l'etat du combat.

### 11.3 Ce qui devra etre duplique puis remplace progressivement

Certaines logiques de gameplay devront exister cote client et cote serveur pendant la transition :

- lecture des inputs ;
- interpretation des actions ;
- calcul de certains effets ;
- synchronisation des etats de personnage.

La version de reference doit devenir celle de Colyseus pour tout ce qui decide reellement d'un resultat de combat.

---

## 12. Architecture applicative cible

L'architecture cible doit etre pensee comme trois applications qui cooperent :

### 12.1 Application 1 : client web

Role : interface et rendu.

### 12.2 Application 2 : backend produit

Role : Supabase pour l'identite, la persistence et les services hors combat.

### 12.3 Application 3 : backend match temps reel

Role : Colyseus pour les parties live.

Le point important est que ces trois briques ne doivent pas se marcher dessus.

Chacune doit avoir une responsabilite nette.

---

## 13. Etapes de refonte recommandees

### Point d'etape au 2026-04-12

La tranche compte n'est plus theorique.

Ce qui est deja fait dans la branche actuelle :

- ecran d'auth mock remplace par un flux Supabase de connexion et d'inscription ;
- compte permanent impose avant l'entree dans le jeu ;
- client Supabase partage et service compte centralises ;
- profil serveur minimal charge dans l'UI ;
- schema initial `profiles` + `player_progression` prepare sous forme de migration SQL.

Ce qui manque encore pour fermer vraiment la tranche compte :

- choisir le projet Supabase cible et appliquer la migration ;
- injecter les vraies variables d'environnement runtime ;
- verifier le flux complet sur un backend reel, pas seulement en build local.

### Etape 1 - Stabiliser la couche compte

Objectif : obtenir un joueur reel et persistant.

Statut : front livre, backend a finaliser.

Travail attendu :

- remplacer l'ecran d'auth mocke ;
- brancher un vrai flux de connexion et d'inscription Supabase ;
- creer un profil joueur serveur ;
- faire disparaitre la notion d'identite locale factice ;
- definir clairement qu'un compte permanent est obligatoire avant d'entrer en jeu.

Resultat attendu :

le joueur existe cote serveur avant meme de jouer un match.

Reste a faire pour clore l'etape :

- appliquer la migration sur le bon projet Supabase ;
- renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ;
- valider la creation reelle des lignes `profiles` et `player_progression` sur inscription.

### Etape 2 - Brancher progression et profil

Objectif : sortir les donnees joueur du navigateur.

Statut : non demarre cote persistence distante, partiellement prepare cote UI.

Travail attendu :

- stocker la progression dans Supabase ;
- stocker l'historique de match dans Supabase ;
- brancher le profil sur de vraies donnees ;
- definir les regles serveur de mise a jour de progression.

Resultat attendu :

le profil devient fiable et la progression ne depend plus uniquement du navigateur.

### Etape 3 - Brancher les loadouts persistants

Objectif : rendre les builds transportables entre appareils et sessions.

Statut : non demarre.

Travail attendu :

- migrer les loadouts vers Supabase ;
- garder un cache local si besoin ;
- resoudre la question des conflits de synchronisation.

Resultat attendu :

le joueur retrouve ses loadouts en se reconnectant.

### Etape 4 - Creer le vrai flux lobby/matchmaking

Objectif : sortir du faux matchmaking local.

Statut : non demarre.

Travail attendu :

- refondre le menu Play autour d'un modal clair avec `Classique`, `Survie` et `Training Tool` ;
- definir les sous-entrees du mode classique : `Versus IA`, `Custom Games`, `Matchmaking` ;
- laisser `Matchmaking` visible mais grise tant que la file reseau n'est pas prete ;
- definir la liste des rooms custom visibles par les joueurs ;
- definir la creation d'une room custom ;
- definir les parametres de room : format 1v1 ou 2v2, bots ajoutes, difficulte des bots ;
- definir la file d'attente ;
- definir le lobby ;
- synchroniser l'etat ready ;
- preparer la transition vers une room de match.

Resultat attendu :

les joueurs comprennent clairement ou ils vont, peuvent ouvrir ou rejoindre une room custom exploitable, se confirmer, puis entrer ensemble dans une partie.

### Etape 5 - Introduire Colyseus pour une room de combat minimale

Objectif : faire tourner un premier match reel entre plusieurs clients.

Statut : livre.

Ce qui a ete implemente :

- dossier `server/` dans le monorepo avec son propre `package.json` TypeScript ;
- `DuelRoom` Colyseus avec schema incremental (`DuelState`, `PlayerState`) ;
- simulation serveur : positions autoritatives, detection de collision bullet/joueur, HP, mort, score de round, transitions de phase (waiting > countdown > active > round_end > match_end) ;
- authentification JWT Supabase sur `onAuth` (facultative en dev si `SUPABASE_JWT_SECRET` vide) ;
- `src/lib/colyseus/client.js` : wrapper client `@colyseus/sdk` pour joindre/quitter une room ;
- `MultiplayerMatch` dans `src/pages/play/multiplayer-match.js` : canvas renderer, input loop 20 Hz (WASD + souris), rendu autoritatif, overlays countdown/round_end/match_end ;
- `_startLobbyMatch()` reroute les rooms 1v1 Custom Games vers Colyseus (2v2 reste local en attendant l'etape 6) ;
- `VITE_COLYSEUS_URL` ajoute dans `.env.example`.

Pour lancer le serveur :
```
cd server && cp .env.example .env && npm install && npm run dev
```

Resultat attendu :

deux joueurs peuvent entrer dans la meme room Custom Games 1v1, voir un combat synchronise par le serveur, avec positions autoritatives, HP et score de round geres cote Colyseus.

### Etape 6 - Rendre le combat autoritatif de bout en bout

Objectif : basculer la logique critique sur Colyseus.

Statut : non demarre.

Travail attendu :

- faire porter les collisions au serveur ;
- faire porter les degats au serveur ;
- faire porter la mort et le score au serveur ;
- gerer les reconnexions ;
- limiter ce que le client peut affirmer.

Resultat attendu :

le serveur devient la verite du match, pas seulement un relai de position.

### Etape 7 - Boucler la fin de match vers Supabase

Objectif : relier le combat live a la progression produit.

Statut : livre (V1).

Ce qui a ete implemente :

- persistance autoritative serveur via `persistAuthoritativeMatchResult()` vers la RPC Supabase `record_authoritative_match_result` ;
- ecriture de l'historique par joueur dans `player_match_history` ;
- mise a jour serveur des stats de progression (`xp`, `level`, `wins`, `losses`, `winstreak`) ;
- fermeture automatique de la custom room Supabase en fin de persistance (`status = closed`) ;
- emission serveur `match-persisted` vers le client pour etat `ok` / `error` ;
- refresh de l'etat compte/profil cote client (`refreshAccountState()`) quand la persistance est confirmee ;
- renforcement de la fiabilite avec retries de persistance cote Colyseus ;
- correction du cas de deconnexion permanente pendant match pour ne pas perdre l'identite des participants au moment de la persistance.

Travail attendu :

- transmettre le resultat du match a Supabase ;
- enregistrer l'historique ;
- attribuer XP et stats ;
- mettre a jour le profil ;
- gerer la sortie propre de la room.

Resultat attendu :

une partie multijoueur produit un vrai resultat persistant.

### Etape 8 - Durcir l'experience reseau

Objectif : rendre le multi utilisable dans des conditions reelles.

Statut : livre (V1).

Ce qui a ete implemente :

- fenetre de reconnexion serveur (`allowReconnection`) avec traitement explicite des departs definitifs ;
- tentative de reconnexion client automatique avec plusieurs essais et statut utilisateur explicite ;
- suivi de sante reseau cote client (freshness des updates autoritatives) avec mode `degraded` / `lost` ;
- badge visuel in-game quand la latence/perte devient visible ;
- separation simulation/rendu cote client avec rendu lisse des joueurs distants (interpolation) ;
- instrumentation de room via message `room-metrics` (joueurs connectes, drops, reconnexions recuperees, echecs).

Travail attendu :

- gerer la reconnexion ;
- gerer les pertes de paquets et la latence visible ;
- mieux separer simulation et rendu ;
- lisser l'affichage client ;
- instrumenter les erreurs et les metrics.

Resultat attendu :

le jeu ne s'effondre pas au premier probleme reseau.

---

## 14. Ordre de priorite recommande

L'ordre le plus rationnel pour ce projet est :

1. finaliser le bootstrap Supabase reel de la couche compte ;
2. progression et historique de match reels ;
3. loadouts distants ;
4. refonte produit du menu Play et des entrees de modes ;
5. rooms custom et lobby reel avant matchmaking automatique ;
6. duel 1v1 Colyseus minimal ;
7. combat autoritatif complet ;
8. synchronisation fin de match vers Supabase ;
9. robustesse reseau et optimisation.

Il ne faut pas commencer par le combat serveur si le jeu n'a pas encore une vraie identite joueur et une vraie persistence. Sinon vous produirez un multi live sans boucle produit durable.

---

## 15. Risques a anticiper

### Risque 1 - vouloir tout migrer d'un coup

La refonte doit etre incrementale. Sinon vous cassez a la fois le prototype local et le futur multi.

### Risque 2 - garder trop de logique decisive dans le client

Si le client continue a decider du score ou des degats, vous aurez un faux serveur autoritatif.

### Risque 3 - melanger lobby produit et room de combat

Le lobby et la room ne sont pas le meme objet. Le lobby prepare un match. La room execute un match.

### Risque 4 - vouloir lancer matchmaking et custom games en meme temps

Produit et technique gagneront en clarte si `Custom Games` sert de premier terrain multijoueur reseau, tandis que `Matchmaking` reste affiche mais inactive jusqu'a ce que la boucle de room, ready check et transition de match soit propre.

### Risque 5 - utiliser Supabase Realtime comme moteur de match

Ce serait une confusion d'outil. Supabase Realtime est utile autour du match, pas pour simuler le match lui-meme.

### Risque 6 - sous-estimer la latence

Un multi temps reel jouable ne se limite pas a "envoyer des positions". Il faut penser experience reseau, lissage visuel, reconnexion, et arbitrage serveur.

---

## 16. Decision executable

Le premier lot n'est plus a definir, il est deja largement engage.

Lot 1 deja entame dans la branche :

- authentification Supabase reelle ;
- profil serveur minimal ;
- migration initiale `profiles` / `player_progression` ;
- obligation de compte permanent avant l'entree en jeu.

Le prochain lot executable doit etre :

- application de la migration sur le projet Supabase cible ;
- persistance serveur de la progression ;
- persistance serveur de l'historique de matchs ;
- remplacement des statistiques encore locales ou decoratives par des lectures serveur ;
- cadrage produit du nouveau modal Play avec ses branches `Classique`, `Survie` et `Training Tool` ;
- cadrage fonctionnel de `Custom Games` comme premiere boucle room/lobby multijoueur ;
- definition d'une ecriture serveur de fin de match avant de toucher au vrai multijoueur.

Ce lot est maintenant le vrai seuil minimal utile avant le lobby reseau et Colyseus.

Avant ce lot, vous avez un prototype solo enrichi.

Apres ce lot, vous avez deja un vrai produit multijoueur naissant :

- les joueurs existent ;
- ils peuvent se retrouver ;
- ils peuvent entrer dans une meme partie ;
- le serveur arbitre le combat ;
- le resultat persiste ;
- le profil evolue vraiment.

---

## 17. Conclusion

La refonte cible n'est pas "mettre Supabase partout" et ce n'est pas non plus "ajouter un serveur reseau a cote" sans revoir le reste.

La bonne refonte pour PROTOTYPE-0 est une architecture a trois niveaux :

- client web pour jouer et afficher ;
- Supabase pour exister et persister ;
- Colyseus pour combattre en temps reel.

Le projet peut avancer proprement si chaque etape produit un gain concret :

- d'abord un vrai joueur ;
- puis un vrai profil ;
- puis un vrai lobby ;
- puis un vrai match ;
- puis une vraie boucle complete entre match et progression.

Le critere de succes final est simple :

deux joueurs se connectent, se retrouvent dans un lobby, entrent dans une room Colyseus, jouent un match autoritatif, puis recuperent un resultat persistant dans leur profil Supabase.