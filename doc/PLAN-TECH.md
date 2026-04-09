# Plan Technique — Sortie du Jeu

Un guide simple pour comprendre comment le jeu sera construit, hébergé et mis en ligne.

---

## 1. Le Jeu (ce que le joueur voit et utilise)

- Le jeu tourne directement dans un navigateur web, sans téléchargement nécessaire.
- L'interface, les menus, le gameplay et les animations sont construits avec les technologies web standard, déjà en place dans le projet.
- Le moteur de rendu utilise le canvas HTML5, ce qui permet d'afficher le jeu de manière fluide sur n'importe quel appareil moderne.
- Aucun plugin, aucune installation requise côté joueur — il suffit d'un lien.
- L'outil de développement Vite permet à l'équipe de tester et modifier le jeu rapidement, sans temps d'attente.

---

## 2. Le Serveur (ce qui tourne en arrière-plan)

- Toute la logique invisible au joueur (comptes, sauvegardes, classements, matchmaking) est gérée par Supabase.
- Supabase est un service externe géré — l'équipe n'a pas à administrer de serveur physique.
- Les comptes joueurs sont sécurisés nativement : connexion par email, mot de passe chiffré, sessions protégées.
- La progression de chaque joueur (niveau, ressources, historique de parties) est stockée dans une base de données fiable et sauvegardée en continu.
- La communication en temps réel (comme la mise en file d'attente ou les mises à jour de lobby) passe par le système Realtime de Supabase, sans serveur supplémentaire à gérer.
- Les règles métier sensibles (comme valider une partie ou attribuer une récompense) sont exécutées côté serveur via des fonctions sécurisées, inaccessibles aux joueurs.

---

## 3. La Mise en Ligne (comment les joueurs y accèdent)

- Le jeu est hébergé sur Vercel, une plateforme spécialisée dans la diffusion de sites web rapides.
- Lorsque l'équipe publie une mise à jour, elle est automatiquement déployée en quelques secondes sur Vercel.
- Le jeu est accessible depuis une URL simple, partageable sur n'importe quel support (réseaux sociaux, email, Discord, etc.).
- Vercel garantit une disponibilité mondiale et une vitesse de chargement optimale peu importe la localisation du joueur.
- Aucun hébergement manuel ni configuration réseau complexe n'est nécessaire.

---

## 4. Ce que ça signifie concrètement pour l'équipe

- Pas de serveur à acheter, configurer ou maintenir.
- Les coûts restent proches de zéro pendant la phase de prototype et de beta.
- L'équipe peut se concentrer sur le jeu lui-même plutôt que sur l'infrastructure.
- Si la base de joueurs grandit, les deux plateformes (Vercel et Supabase) montent en charge automatiquement.
- Tout le suivi des joueurs, des erreurs et des performances est disponible depuis des tableaux de bord en ligne accessibles à l'équipe.

---

## 5. Limites à connaître

- Cette stack est pensée pour un jeu web, pas pour une sortie sur console ou sur boutique (Steam, Epic, etc.) dans l'état actuel.
- Si le jeu venait à nécessiter un moteur serveur autoritaire pour des parties compétitives en temps réel, une brique supplémentaire devrait être ajoutée à terme.
- La dépendance à des services tiers (Vercel, Supabase) implique de respecter leurs conditions d'utilisation et leurs plafonds gratuits.
