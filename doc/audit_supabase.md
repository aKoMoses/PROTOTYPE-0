# Audit Supabase - Integration comptes, progression, auth et realtime

Date : 2026-04-12

## Objectif

Ce document cadre une integration Supabase realiste pour PROTOTYPE-0.

Le but n'est pas de brancher "un backend" de facon abstraite, mais de definir precisement :

- ce que Supabase doit gerer ;
- ce qui doit rester local au navigateur ;
- comment migrer l'existant sans casser le prototype ;
- comment securiser les comptes, la progression, l'historique et le matchmaking ;
- ou le realtime a du sens, et ou il ne faut surtout pas l'utiliser.

---

## 1. Etat actuel du projet

Le projet est aujourd'hui un jeu web Vite en HTML/CSS/JS natif, sans backend applicatif.

Constats confirmes dans le repo :

- `auth.js` simule une authentification de session via `sessionStorage` avec une identite mockee `SAA_BOT`.
- `src/progression.js` stocke l'XP dans `localStorage` via la cle `p0-progression-v1`.
- `src/loadouts/storage.js` stocke les loadouts dans `localStorage` via `p0-loadouts-v2-custom`.
- `src/session.js` stocke l'etat de partie et de prematch dans `sessionStorage` via `prototype0.game-session`.
- `src/pages/profile/profile-page.js` reste entierement mocke avec stats et historique hardcodes.
- Le matchmaking actuel est un state machine local, pas un vrai systeme reseau.

Conclusion : l'architecture front est deja solide pour un prototype solo/local, mais toute la boucle persistance + compte + temps reel est encore simulée ou stockee uniquement cote navigateur.

---

## 2. Decision d'architecture

Supabase doit devenir la source de verite pour tout ce qui doit survivre au navigateur ou etre partage entre plusieurs clients.

### Ce qui doit passer dans Supabase

- comptes joueurs ;
- profils publics et metadata de joueur ;
- progression persistante ;
- historique de matchs ;
- loadouts sauvegardes ;
- etat de file d'attente / lobby / ready check ;
- presence realtime des joueurs dans les lobbies ;
- attribution des recompenses et validations sensibles via code serveur.

### Ce qui doit rester local

- etat instantane du gameplay pendant un match ;
- resume de session navigateur en cours ;
- preferences purement locales et non critiques si souhaitees ;
- cache temporaire offline pour fluidifier l'UX.

### Point critique

Supabase Realtime convient bien pour :

- queue,
- lobby,
- ready state,
- selection de map,
- countdown,
- presence.

En revanche, il ne faut pas utiliser Supabase Realtime comme moteur de synchronisation frame-par-frame du combat. Le gameplay arena actuel est trop temps reel pour reposer sur des ecritures Postgres ou des evenements canalises a haute frequence. Si un jour le jeu devient un vrai PvP autoritatif temps reel, il faudra une brique serveur dediee.

---

## 3. Capacites Supabase pertinentes

Les APIs Supabase actuelles couvrent correctement le besoin cible :

- Auth : `signUp`, `signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`.
- Guest sessions : `signInAnonymously()` permet de laisser entrer un joueur sans imposer un compte complet immediatement.
- Profils : pattern officiel recommande avec table `public.profiles` referencee a `auth.users` et creee via trigger `handle_new_user()`.
- Securite : Row Level Security pour limiter chaque joueur a ses propres donnees.
- Realtime : channels avec `broadcast`, `presence` et `postgres_changes` pour les lobbies et les mises a jour de file.
- Edge Functions : bon emplacement pour proteger les ecritures sensibles comme l'attribution d'XP, l'enregistrement d'un match ou la creation d'un lobby.

Conclusion : Supabase couvre bien comptes + persistence + realtime leger du prototype, a condition de bien separer donnees critiques, donnees locales et orchestration serveur.

---

## 4. Cible produit recommandee

La bonne cible pour PROTOTYPE-0 n'est pas "connexion obligatoire avant de jouer".

La meilleure approche est :

1. entree immediate en jeu via session anonyme Supabase ;
2. progression et loadouts rattaches a cet utilisateur anonyme ;
3. proposition d'upgrade vers compte email/mot de passe quand le joueur veut securiser sa progression ;
4. une fois upgrade, le meme profil conserve ses donnees.

Pourquoi cette approche est la bonne ici :

- elle garde la friction d'entree proche de zero ;
- elle remplace proprement le faux portail `auth.js` actuel ;
- elle permet d'avoir tout de suite un identifiant serveur fiable ;
- elle evite de perdre la progression si le joueur revient plus tard sur le meme appareil ou se connecte depuis un autre.

---

## 5. Schema de donnees recommande

### 5.1 `profiles`

Table publique liee a `auth.users`.

Role : identite joueur, nom affichable, avatar, timestamps, flags de progression du compte.

Champs recommandes :

- `id uuid primary key references auth.users(id) on delete cascade`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`
- `display_name text`
- `avatar_key text`
- `account_kind text check (account_kind in ('anonymous', 'registered'))`
- `last_seen_at timestamptz`

Pattern recommande : trigger `handle_new_user()` pour creer la ligne au signup ou a la creation de l'utilisateur anonyme.

### 5.2 `player_progression`

Une ligne par joueur.

Role : stocker l'etat derive minimal de progression cote serveur.

Champs recommandes :

- `player_id uuid primary key references profiles(id) on delete cascade`
- `xp integer not null default 0`
- `level integer not null default 1`
- `best_survival_wave integer not null default 0`
- `wins integer not null default 0`
- `losses integer not null default 0`
- `winstreak integer not null default 0`
- `updated_at timestamptz default now()`

Important : `level` peut etre derive de `xp`, mais le garder materialise simplifie le rendu, les index et certains tableaux de bord. Si vous voulez minimiser la redondance, stockez seulement `xp` et derivez le reste en SQL ou cote app.

### 5.3 `match_history`

Table append-only.

Role : historique persistant des parties pour le profil et les stats.

Champs recommandes :

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid references profiles(id) on delete cascade`
- `mode text`
- `map_key text`
- `result text`
- `score text`
- `survival_wave integer`
- `build jsonb`
- `xp_awarded integer not null default 0`
- `created_at timestamptz default now()`

Le champ `build jsonb` est adapte ici, car le loadout d'une partie est une photographie historique. Il ne doit pas etre normalise agressivement tant que le jeu est encore en prototype evolutif.

### 5.4 `player_loadouts`

Role : remplacer a terme `p0-loadouts-v2-custom` de `localStorage`.

Champs recommandes :

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid references profiles(id) on delete cascade`
- `name text not null`
- `favorite boolean not null default false`
- `source text not null`
- `system_preset boolean not null default false`
- `preset_key text`
- `preset_unlock_level integer`
- `role text`
- `description text`
- `tags text[] not null default '{}'`
- `build jsonb not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Ici aussi, `build jsonb` est un bon compromis tant que le schema de loadout peut encore changer.

### 5.5 `player_settings`

Role : preferences serveur utiles sur plusieurs appareils.

Champs recommandes :

- `player_id uuid primary key references profiles(id) on delete cascade`
- `audio jsonb`
- `visual jsonb`
- `controls jsonb`
- `updated_at timestamptz default now()`

Les reglages purement cosmetiques peuvent rester locaux au debut. Cette table n'est utile que si vous voulez la coherence cross-device.

### 5.6 `matchmaking_queue`

Role : file d'attente durable et observable.

Champs recommandes :

- `id uuid primary key default gen_random_uuid()`
- `player_id uuid references profiles(id) on delete cascade`
- `playlist text not null`
- `region text`
- `status text check (status in ('queued', 'matched', 'cancelled', 'expired'))`
- `joined_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 5.7 `match_lobbies`

Role : etat durable d'un lobby avant lancement.

Champs recommandes :

- `id uuid primary key default gen_random_uuid()`
- `playlist text not null`
- `status text check (status in ('forming', 'ready', 'loading', 'closed'))`
- `map_key text`
- `settings jsonb not null default '{}'`
- `host_player_id uuid references profiles(id)`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### 5.8 `lobby_members`

Role : composition du lobby.

Champs recommandes :

- `lobby_id uuid references match_lobbies(id) on delete cascade`
- `player_id uuid references profiles(id) on delete cascade`
- `is_ready boolean not null default false`
- `selected_loadout_id uuid references player_loadouts(id)`
- `joined_at timestamptz default now()`
- cle primaire composite `(lobby_id, player_id)`

---

## 6. Securite et RLS

Le point le plus important de toute l'integration : ne pas laisser le client ecrire directement de la progression arbitraire.

### Regle generale

- lecture de ses propres donnees : oui via RLS ;
- edition de son profil simple : oui via RLS ;
- ecriture de progression, XP, historique de match, resultat de queue : non directement depuis le client.

### Ce que le client peut ecrire directement

- `profiles.display_name`
- `profiles.avatar_key`
- `player_settings`
- certains loadouts si vous acceptez ce niveau de confiance cote client

### Ce qui doit passer par une fonction serveur

- gain d'XP ;
- creation d'entrees `match_history` ;
- calcul de stats derivees ;
- passage de `queued` a `matched` ;
- creation des lobbies ;
- resolution de ready check ;
- attribution de recompenses de fin de run.

### Recommendation ferme

Utiliser une Edge Function ou une fonction SQL `rpc` securisee pour toute operation qui modifie la progression ou valide une partie.

Pourquoi : si le navigateur peut faire un simple `update player_progression set xp = 99999`, votre economie de progression est deja compromise.

---

## 7. Authentification recommandee

### 7.1 Remplacer le faux portail actuel

`auth.js` ne doit plus stocker une chaine mockee en session. Cette couche doit etre remplacee par un vrai client Supabase.

### 7.2 Flux recommande

Au boot du jeu :

1. creer le client Supabase ;
2. appeler `supabase.auth.getSession()` ;
3. si aucune session existe, appeler `supabase.auth.signInAnonymously()` ;
4. enregistrer `supabase.auth.onAuthStateChange(...)` pour resynchroniser l'etat UI ;
5. charger `profiles`, `player_progression`, `player_loadouts` et l'historique recent.

### 7.3 Upgrade en compte permanent

Ajouter une UI simple pour :

- creer un compte email/mot de passe ;
- se connecter ;
- se deconnecter ;
- afficher l'etat du compte actuel.

### 7.4 Ce qu'il faut afficher au joueur

- invite : "Session invitée active" ;
- compte complet : "Compte sécurisé" ;
- avertissement clair avant logout d'un compte anonyme si la progression n'est pas liee a un compte permanent.

---

## 8. Realtime recommande

### 8.1 Usages pertinents

Supabase Realtime doit etre utilise pour :

- presence des joueurs dans un lobby ;
- etat ready / not ready ;
- diffusion du choix de map ;
- countdown de lobby ;
- mise a jour visuelle de la queue ;
- notifications de match trouve.

### 8.2 Trois mecanismes utiles

#### Presence

Le bon usage pour savoir quels joueurs sont connectes dans un lobby et quand ils quittent.

Exemple de besoin dans PROTOTYPE-0 :

- afficher qui est encore dans le salon ;
- enlever automatiquement un joueur d'un ready check s'il se deconnecte ;
- montrer un statut "online / reconnecting".

#### Broadcast

Le bon usage pour les evenements ephemeres qui n'ont pas besoin d'etre stockes en base.

Exemples :

- "player-ready-toggled" ;
- "host-start-countdown" ;
- "cancel-matchmaking" ;
- "focus-build-step".

#### Postgres Changes

Le bon usage pour suivre les changements persistants des tables comme :

- `matchmaking_queue` ;
- `match_lobbies` ;
- `lobby_members`.

Exemple : quand une ligne `match_lobbies.status` passe de `forming` a `ready`, le client avance l'UI de `found` vers `lobby` ou `loading`.

### 8.3 Limite importante

Ne pas streamer la position du joueur, les bullets, les cooldowns, les HP ou le tick combat via Realtime/Postgres. Ce n'est pas le bon outil pour ce niveau de frequence.

---

## 9. Mapping de l'existant vers Supabase

### 9.1 Progression

Existant : `src/progression.js` lit/ecrit `localStorage`.

Cible :

- le serveur devient la source de verite ;
- le client garde un cache local optionnel ;
- `addXp()` ne doit plus persister directement, mais declencher une operation serveur quand le gain est legitime.

Recommendation concrete :

- conserver `src/progression.js` comme facade de lecture locale + rendu ;
- injecter un adaptateur Supabase sous le capot ;
- remplacer l'ecriture directe `localStorage` par un cycle `read cache -> sync serveur -> mettre a jour le snapshot`.

### 9.2 Loadouts

Existant : `src/loadouts/storage.js` stocke tout en local.

Cible :

- lecture initiale depuis Supabase si disponible ;
- fallback local si hors ligne ;
- synchronisation montante lors de la connexion.

Bon compromis de transition :

- garder le module actuel ;
- lui ajouter un mode `local-first, remote-sync` ;
- migrer plus tard vers `remote-first` une fois la fiabilite validee.

### 9.3 Session de partie

Existant : `src/session.js` utilise `sessionStorage` pour reprendre une partie ou un prematch dans le meme navigateur.

Cible : conserver ce comportement local.

Cette couche ne doit pas aller dans Supabase au premier passage. Elle correspond a un confort navigateur, pas a une donnee produit critique.

### 9.4 Profil

Existant : `src/pages/profile/profile-page.js` est entierement mocke.

Cible : le profil doit lire :

- `profiles`
- `player_progression`
- `match_history`
- stats derivees eventuellement pre-calculees ou materialisees.

### 9.5 Matchmaking

Existant : la state machine `src/matchmaking/orchestrator.js` et `src/matchmaking/state.js` est purement locale.

Cible : garder la state machine UI, mais remplacer la source d'evenements par Supabase.

Autrement dit :

- la state machine front reste utile ;
- les transitions ne sont plus uniquement timers locaux ;
- elles repondent aux changements de queue, lobby et presence venant du backend.

---

## 10. Architecture de code recommandee dans le repo

Ajouter une couche claire, sans melanger Supabase partout dans le code existant.

Structure recommandee :

- `src/lib/supabase/client.js` : creation du client Supabase
- `src/lib/supabase/auth.js` : session, login, guest, logout, listener auth
- `src/lib/supabase/profile.js` : lecture/ecriture du profil
- `src/lib/supabase/progression.js` : fetch progression + sync snapshot
- `src/lib/supabase/loadouts.js` : CRUD loadouts
- `src/lib/supabase/match-history.js` : lecture historique
- `src/lib/supabase/matchmaking.js` : queue, lobby, presence, subscriptions
- `src/lib/supabase/functions.js` : appels Edge Functions

Ne pas disperser des appels `supabase.from(...).update(...)` dans les modules gameplay. Le gameplay doit parler a des services metier, pas a la base directement.

---

## 11. Edge Functions / RPC a prevoir

### 11.1 `finalize_match`

Role : valider une fin de duel, team duel ou survie, calculer l'XP, ecrire `match_history`, mettre a jour `player_progression`.

Entree attendue :

- mode ;
- map ;
- score ;
- resultat ;
- wave si survie ;
- snapshot de build ;
- metadata de session.

La fonction doit revalider le payload au minimum et appliquer des caps d'XP cote serveur.

### 11.2 `sync_legacy_local_state`

Role : importer une premiere fois les donnees locales existantes dans Supabase.

Entree attendue :

- progression locale ;
- loadouts locaux ;
- historique local quand il existera ;
- metadata de migration.

### 11.3 `queue_for_match`

Role : creer ou mettre a jour l'entree de file d'attente du joueur.

### 11.4 `create_or_join_lobby`

Role : affecter un joueur a un lobby et retourner les identifiants utiles pour les abonnements realtime.

---

## 12. Strategie de migration recommandee

### Phase 1 - Fondation

- creer le projet Supabase ;
- ajouter `@supabase/supabase-js` ;
- definir `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ;
- creer `profiles`, `player_progression`, `player_loadouts`, `match_history` ;
- activer RLS ;
- creer le trigger `handle_new_user()`.

### Phase 2 - Auth reelle

- remplacer `auth.js` mock par un client Supabase ;
- boot en `signInAnonymously()` si pas de session ;
- brancher `onAuthStateChange()` ;
- afficher l'etat du compte dans l'UI.

### Phase 3 - Progression et profil

- charger la progression depuis Supabase ;
- remplacer le profil mocke ;
- ecrire l'historique de match ;
- synchroniser les victoires, defaites et meilleure vague.

### Phase 4 - Loadouts

- migrer les presets utilisateur vers `player_loadouts` ;
- conserver un cache local pour resilience ;
- gerer les conflits par `updated_at` le plus recent.

### Phase 5 - Matchmaking realtime

- brancher queue et lobby via tables + channels realtime ;
- utiliser presence pour la liste des membres ;
- utiliser broadcast pour les signaux ephemeres ;
- laisser le combat lui-meme hors du scope realtime serveur autoritaire.

---

## 13. Risques et erreurs a eviter

### 13.1 Erreur classique : tout mettre en ecriture directe depuis le client

Si le client peut modifier la progression sans mediation serveur, la triche est triviale.

### 13.2 Erreur classique : utiliser realtime pour le combat

Supabase ne doit pas porter le tick gameplay du duel live.

### 13.3 Erreur classique : migration brutale de tout le localStorage

Il faut une migration progressive et idempotente. Le joueur peut avoir des donnees locales incompletes, anciennes ou corrompues.

### 13.4 Erreur classique : confusion entre session navigateur et compte joueur

`sessionStorage` actuel pour reprendre une partie n'est pas un remplacement d'auth. Ce sont deux besoins differents.

### 13.5 Erreur classique : sur-normaliser trop tot

Pour le prototype, `jsonb` sur les builds et certains settings est preferable a une modelisation trop rigide.

---

## 14. Recommandation finale

Supabase est une bonne cible pour PROTOTYPE-0, a condition de l'utiliser pour ce qu'il sait bien faire :

- identite joueur ;
- persistence fiable ;
- profils et progression ;
- historique et statistiques ;
- queue/lobby/realtime leger ;
- logique sensible executee serveur.

Le meilleur plan n'est pas une refonte totale du jeu autour de Supabase. Le meilleur plan est d'ajouter une couche services propre au-dessus de l'existant, puis de migrer dans cet ordre :

1. auth reelle ;
2. profil + progression ;
3. historique de matchs ;
4. loadouts distants ;
5. matchmaking realtime.

Le point produit le plus important est simple : Supabase doit fermer la boucle aujourd'hui ouverte dans le projet.

Boucle cible :

combat -> validation serveur -> progression -> profil -> matchmaking/lobby -> combat

---

## 15. Decision executable

Si l'equipe veut commencer tout de suite sans surinvestir, le premier lot a implementer est :

- session anonyme Supabase au boot ;
- table `profiles` ;
- table `player_progression` ;
- table `match_history` ;
- remplacement du profil mocke ;
- Edge Function `finalize_match` pour duel et survie.

Ce lot suffit deja a transformer le prototype : le joueur existe vraiment, sa progression survit, son profil devient vrai, et les futures couches realtime pourront se brancher dessus proprement.