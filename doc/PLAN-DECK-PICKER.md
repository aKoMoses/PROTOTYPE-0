# Plan — Deck Picker In-Lobby (Option C)
> Choisir un loadout sauvegardé avant de cliquer PRÊT, dans les 3 modes classiques + Custom Games

**Status :** Planification  
**Priorité :** Moyenne (après stabilisation Custom Rooms)  
**Dépend de :** `player_loadouts` (existant), `room_members.loadout_snapshot` + `selected_loadout_id` (à migrer)

---

## Contexte

Actuellement, le loadout actif au moment du prématch est celui de `app-state.js/loadout` — un seul état global, éditable via le Build Lab. Il n'y a pas de sélection de deck par match.

L'objectif est de permettre à chaque joueur :
1. de choisir parmi ses decks sauvegardés (`player_loadouts`) juste avant de cliquer PRÊT
2. que ce choix soit visible des autres joueurs en lobby (icônes W/Q/E/F/P/R)
3. que le match démarre avec le bon loadout appliqué

---

## Les 3 modes classiques concernés

> **Correction :** Les 3 modes classiques ne sont pas les sous-modes internes (duel/survival/teamDuel) mais les **catégories de jeu** exposées au joueur :

| Catégorie | Sous-modes couverts | Moment de sélection du deck |
|---|---|---|
| **Matchmaking** | `duel` (1v1 ranked), `teamDuel` (2v2 ranked) | Phase Build — timer 60s — drawer latéral |
| **Custom Games** | `duel` / `teamDuel` en room privée | Lobby Blue/Red — avant bouton PRÊT |
| **Versus IA** | `duel` vs bot, `survival`, `teamDuel` vs bots | Phase Build — tab DECKS dans le Build Lab |

**Règle générale :**
- **Matchmaking** → sélection rapide (le timer tourne), donc drawer latéral non-bloquant
- **Custom Games** → sélection confortable (pas de timer), donc panneau flottant avec preview complète
- **Versus IA** → sélection libre (pas de pression), donc tab DECKS dédié dans le Build Lab

---

## Architecture cible (Option C)

```
player_loadouts (existant)
  id, name, build (jsonb), favorite, tags…

room_members (existant)
  + selected_loadout_id  FK → player_loadouts(id)  ON DELETE SET NULL
  + loadout_snapshot     jsonb   -- copie au moment de la sélection
```

**Règle de lecture :**  
L'UI lit toujours `loadout_snapshot`. `selected_loadout_id` sert uniquement à l'UX (afficher "Deck 3 — Assault" sélectionné).

**Règle d'écriture :**  
Quand le joueur change de deck → `UPDATE room_members SET selected_loadout_id = $1, loadout_snapshot = $2`.

---

## Migration de base de données

### Fichier : `supabase/migrations/20260414_room_members_deck.sql`

```sql
-- Étape 1 : Ajout des colonnes sur room_members
alter table public.room_members
  add column if not exists selected_loadout_id text
    references public.player_loadouts(id) on delete set null,
  add column if not exists loadout_snapshot jsonb not null default '{}'::jsonb;

comment on column public.room_members.selected_loadout_id is
  'FK optionnelle vers le deck choisi dans player_loadouts.
   NULL si guest ou joueur sans compte.';

comment on column public.room_members.loadout_snapshot is
  'Snapshot dénormalisé du loadout actif.
   Format: {weapon, modules[], implants[], core, avatar, weaponSkin}
   Toujours lu par l''UI — ne nécessite pas de JOIN.';

-- Index GIN pour futures recherches sur composition
create index if not exists room_members_loadout_snapshot_gin
  on public.room_members using gin (loadout_snapshot);

-- RLS : un joueur peut mettre à jour son propre snapshot
drop policy if exists "Member can update own loadout snapshot" on public.room_members;
create policy "Member can update own loadout snapshot"
  on public.room_members for update
  using ((select auth.uid()) = player_id)
  with check ((select auth.uid()) = player_id);
```

> **Note :** Pour les modes classiques (non-custom), la table `room_members` n'est pas encore utilisée. Le deck picker classique passe par `app-state.js` directement — voir section "Mode Classique" ci-dessous.

---

## Plan d'implémentation par phase

---

### Phase 1 — Socle : Deck Picker dans Custom Games *(priorité haute)*

**Objectif :** Quand un joueur est dans le Custom Lobby (`custom-lobby-screen`), il peut cliquer sur son slot joueur pour ouvrir un panneau de sélection de deck.

#### 1.1 Service — `src/lib/rooms/service.js`

Ajouter `loadoutSnapshot` dans `joinRoom()` et `createRoom()` :

```js
export async function joinRoom(roomId, loadoutSnapshot = {}) {
  // ...upsert existant...
  await sb.from(MEMBERS_TABLE).upsert({
    // ...champs existants...
    loadout_snapshot: loadoutSnapshot,
  });
}

export async function updateMemberLoadout(roomId, loadoutId, snapshot) {
  const sb = getSupabaseClient();
  const { data: { session } } = await sb.auth.getSession();
  return sb.from(MEMBERS_TABLE).update({
    selected_loadout_id: loadoutId ?? null,
    loadout_snapshot: snapshot,
  })
  .eq("room_id", roomId)
  .eq("player_id", session.user.id);
}
```

#### 1.2 Composant — `src/matchmaking/components/deck-picker-panel.js`

Nouveau composant standalone (pas un `PrematchStepBase`) — panneau flottant déclenché sur demande.

**Responsabilités :**
- Charger les loadouts du joueur via `loadSavedLoadouts()` (déjà dans `src/lib/loadouts/service.js`)
- Afficher une liste de decks : nom, icône W principale, tags, badge `favori`
- Option "Deck actuel" (non sauvegardé) toujours présente en tête de liste
- Confirmer → appel `updateMemberLoadout()` → fermer le panneau

**Interface du composant :**
```js
class DeckPickerPanel {
  constructor({ anchor, onSelect })
  open(currentLoadout, savedLoadouts)
  close()
}
```

#### 1.3 Intégration dans `custom-room-lobby.js`

- Clic sur la carte du joueur local → ouvre `DeckPickerPanel`
- Réception `onSelect(loadoutId, snapshot)` → appel service + `_renderRoster()`
- Le slot rendu lit `m.loadout_snapshot` pour afficher les icônes via `renderContentIcon()`

#### 1.4 `custom-room-browser.js`

Passer le loadout courant au `joinRoom()` :
```js
import { loadout } from "../../state/app-state.js";
await joinRoom(roomId, { ...loadout });
```

---

### Phase 2 — Deck Picker dans les modes classiques *(priorité moyenne)*

Les modes `duel`, `survival`, `teamDuel` n'ont pas de `room_members`. Le choix de deck se fait dans l'**écran Build**, avant de cliquer "Deploy Unit".

#### 2.1 Emplacement UI : nouveau tab dans le Build Lab

Ajouter un onglet `DECKS` dans la nav du Build Lab (à côté de `WEAPON / MODULES / IMPLANT / CORE`) :

```
[ WEAPON ] [ MODULES ] [ PERK ] [ CORE ] [ DECKS ▼ ]
```

Comportement :
- Liste des decks sauvegardés avec preview de la composition complète
- Clic → applique le deck dans `app-state.js/loadout` + met à jour les slots visuels
- Badge `ACTUEL` sur le deck en cours si il correspond exactement à un sauvegardé

#### 2.2 Modification de `src/build/ui.js`

```js
// Nouveau renderer pour l'onglet DECKS
function renderDeckTab(container, savedLoadouts, currentLoadout) {
  // ...
}

// Appeler renderDeckTab quand buildCategory === "decks"
```

#### 2.3 Modification de `src/state/app-state.js`

Ajouter `selectedLoadoutId` pour traçabilité :
```js
export const uiState = {
  // ...existant...
  selectedLoadoutId: null,  // id du deck choisi, null si non sauvegardé
};
```

#### 2.4 Modification de `src/config.js`

Ajouter `"decks"` dans les `buildCategory` valides (selon où c'est validé).

---

### Phase 3 — Deck Picker dans le Prematch Flow matchmaking *(priorité basse)*

Pour les modes avec file d'attente (`duel`, `teamDuel`), ajouter un widget de sélection rapide de deck **pendant la phase Build** (timer de 60s).

**Format :** Drawer latéral "Changer de deck" accessible via bouton en haut du Build Lab.  
Ne remplace pas le Build Lab — c'est un raccourci pour charger un preset en un clic.

---

## Fichiers à créer / modifier par phase

### Phase 1

| Fichier | Action |
|---|---|
| `supabase/migrations/20260414_room_members_deck.sql` | Créer |
| `src/lib/rooms/service.js` | Modifier — `joinRoom` + `updateMemberLoadout` |
| `src/matchmaking/components/deck-picker-panel.js` | Créer |
| `src/matchmaking/styles/custom-rooms.css` | Modifier — styles du panneau |
| `src/matchmaking/components/custom-room-lobby.js` | Modifier — ouvrir picker + lire snapshot |
| `src/matchmaking/components/custom-room-browser.js` | Modifier — passer loadout au join |

### Phase 2

| Fichier | Action |
|---|---|
| `src/build/ui.js` | Modifier — tab DECKS + `renderDeckTab()` |
| `src/state/app-state.js` | Modifier — `selectedLoadoutId` |
| `src/matchmaking/styles/custom-rooms.css` ou `loadout.css` | Modifier — styles tab DECKS |

### Phase 3

| Fichier | Action |
|---|---|
| `src/build/ui.js` | Modifier — drawer "Changer de deck" |
| `src/matchmaking/components/build-step.js` | Modifier — bouton trigger drawer |

---

## Schéma de flux final

```
Joueur ouvre le prématch
        │
        ▼
  Choisit un mode
        │
   ┌────┴─────────────────────────────┐
   │ Classique (duel/survival/team)   │   Custom Game
   │                                  │        │
   ▼                                  │        ▼
Build Lab                             │   Room Browser
[tab DECKS] ← Phase 2                │        │
        │                             │        ▼
        ▼                             │  Custom Lobby
Apply loadout                         │  [clic slot joueur]
in app-state                          │  DeckPickerPanel ← Phase 1
        │                             │        │
        ▼                             │        ▼
  Deploy Unit                         │  updateMemberLoadout()
  (patch loadout at launch)           │  → loadout_snapshot mis à jour
                                      │  → visible des autres (Realtime)
                                      └────────┘
                                               │
                                               ▼
                                     Match démarre avec
                                     le bon loadout appliqué
```

---

## Décisions techniques — ✅ Validées

1. **Tab DECKS dans le Build Lab** → tab supplémentaire dans la nav existante (à côté de WEAPON / MODULES / PERK / CORE).

2. **Appliquer un deck** → écraser `app-state.loadout` entier + confirmation si le joueur avait modifié manuellement des slots.

3. **Persistance du choix de deck entre sessions** → stocker `selectedLoadoutId` dans `localStorage` comme "dernier deck utilisé".
