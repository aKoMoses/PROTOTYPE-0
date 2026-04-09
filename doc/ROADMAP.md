# Roadmap — De Prototype à Lancement

Un aperçu des étapes prévues pour amener le jeu du stade actuel jusqu'à une version jouable par le public.

---

## Phase 1 — Stabilisation du Prototype
*Objectif : avoir une version propre, jouable de bout en bout, sans erreur bloquante.*

- Corriger les bugs connus qui empêchent de terminer une partie complète.
- S'assurer que toutes les fonctionnalités existantes fonctionnent ensemble de manière cohérente.
- Nettoyer les parties inachevées ou temporaires du jeu pour éviter toute confusion.
- Valider l'expérience complète d'un joueur, de la connexion jusqu'à la fin d'une partie.
- Documenter l'état exact du jeu pour que toute l'équipe parte du même point de repère.

---

## Phase 2 — Connexion au Backend
*Objectif : brancher le jeu sur Supabase pour que les comptes et la progression soient réels.*

- Mettre en place le système de création de compte et de connexion joueur.
- Sauvegarder la progression des joueurs en base de données après chaque partie.
- Relier le matchmaking existant au système de temps réel pour que les joueurs se trouvent entre eux.
- Tester que les données d'un joueur sont bien récupérées à chaque reconnexion.
- S'assurer qu'aucune donnée sensible n'est accessible ou modifiable côté joueur.

---

## Phase 3 — Connexion au Backend
*Objectif : brancher le jeu sur Supabase pour que les comptes et la progression soient réels.*

- Mettre en place le système de création de compte et de connexion joueur.
- Sauvegarder la progression des joueurs en base de données après chaque partie.
- Relier le matchmaking existant au système de temps réel pour que les joueurs se trouvent entre eux.
- Tester que les données d'un joueur sont bien récupérées à chaque reconnexion.
- S'assurer qu'aucune donnée sensible n'est accessible ou modifiable côté joueur.

---

## Phase 4 — Beta Fermée
*Objectif : faire jouer un groupe restreint de personnes de confiance et recueillir des retours.*

- Déployer une première version en ligne sur Vercel, accessible uniquement via invitation.
- Recruter entre 10 et 30 testeurs : proches, connaissances, communautés ciblées.
- Recueillir leurs retours sur le ressenti général, la lisibilité du jeu et les bugs rencontrés.
- Identifier les points de friction majeurs et les corriger en priorité.
- Valider que la stack technique tient la charge avec de vrais utilisateurs connectés simultanément.
