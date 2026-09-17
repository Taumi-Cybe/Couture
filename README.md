# NAYA — Atelier de couture

Application indépendante : Next.js, React/TSX, TypeScript, CSS, PostgreSQL et Supabase Auth. Hébergement préparé pour Render. Aucun compte ChatGPT nécessaire aux clients ou à l’administrateur.

## Voir la version de démonstration

Ouvrir APERCU-NAYA.html dans un navigateur. Tout est inclus dans ce fichier. Les prix, la cliente et les rendez-vous sont des exemples en mémoire, réinitialisés au rechargement. Cliquer « Tester l’administration » pour confirmer/refuser un rendez-vous avec un message, changer les tarifs et renseigner l’adresse. Le code DEMO-NAYA permet de tester le suivi. Aucune réservation réelle n’est envoyée.

Dans l’application Next, le même aperçu se trouve sur /apercu, séparé des données réelles.

## Fonctionnalités

- 20 silhouettes distinctes et 10 options de tissu, soit 200 références de personnalisation. Il ne s’agit pas de 200 tenues photographiées différentes. Les images changent entre les pages ; les tissus sont regroupés dans chaque fiche. La photo illustre la coupe, pas chaque variante de tissu.
- Cinq nouvelles silhouettes avec trois vues illustratives générées : face, profil et dos ; quinze modèles restent en vue unique. Ces visuels d’inspiration ne sont pas des photos de réalisations du magasin.
- Tarification modifiable par silhouette : confection, tissu inclus ou non, finitions, devise et notes. Sans prix renseigné : sur devis. Le devis affiché à la demande est conservé dans la commande.
- Réservation : modèle, coordonnées, date/heure, date de retrait souhaitée, commentaire. Une demande n’est pas une confirmation. La date de retrait reste à convenir avec le couturier.
- Calendrier : journées verrouillées et créneaux occupés inréservables, contrôle côté serveur et index SQL contre les doublons. Une demande en attente réserve son créneau ; un refus ou une annulation le libère. Bloquer une journée ne supprime pas les rendez-vous déjà présents.
- Administration : confirmer, remettre en attente, refuser ou annuler, avec une explication obligatoire sauf lors d’une confirmation. Le message apparaît dans le suivi client.
- Suivi par code confidentiel, progression de couture et état prêt. Aucun email/SMS automatique n’est configuré.
- Adresse, horaires, téléphone et instructions d’accès administrables ; itinéraires Google Maps voiture/transports/marche dès que l’adresse est renseignée.

## Installation locale

Node 22.13+ et pnpm 11.25.0 requis. Copier `.env.example` en `.env.local`, renseigner les valeurs puis :

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Next charge `.env.local`. Pour la migration en ligne de commande, fournir DATABASE_URL dans l’environnement (le script ne charge pas `.env.local` automatiquement), puis exécuter `pnpm db:migrate`. Le schéma vise Supabase PostgreSQL, avec les rôles anon/authenticated présents.

## Mise en ligne Render + Supabase

1. Créer votre projet Supabase dans votre compte. Récupérer l’URL du projet, sa clé publishable et la chaîne PostgreSQL du pooler (connexion session recommandée, paramètres TLS de Supabase conservés).
2. Dans Supabase Authentication, créer le compte administrateur et désactiver les inscriptions publiques si elles sont inutiles. Depuis l’éditeur SQL du projet, attribuer le rôle à l’utilisateur exact :

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE id = 'REMPLACER_PAR_UUID_ADMIN';
```

3. Placer ce dossier dans un dépôt Git privé. Ne pas versionner `.env.local`, node_modules ou .next.
4. Dans Render, créer un Blueprint à partir du dépôt (`render.yaml`). Renseigner DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY et SITE_URL (l’URL publique finale, sans slash final). Adapter ATELIER_TIMEZONE au fuseau de la boutique. Les éventuels abonnements restent à choisir dans vos comptes.
5. Render installe, compile puis applique les migrations à chaque démarrage de manière transactionnelle et une seule fois. La connexion SQL doit pouvoir créer les tables et gérer leur RLS ; elle reste strictement côté serveur. Ce dossier vise une nouvelle base ; ne pas importer directement des commandes d’une ancienne version dont les références modèles diffèrent.
6. Se connecter dans « Espace atelier », avec email et mot de passe. Au premier accès, scanner le QR dans une application d’authentification et valider le code à 6 chiffres. La double authentification est obligatoire pour les actions administratives. Un propriétaire Supabase pourra réinitialiser les facteurs si l’appareil est perdu.
7. Renseigner les véritables tarifs, devise et adresse. Faire une réservation d’essai, sa confirmation et son suivi avant ouverture aux clients. Les connexions réelles Render/Supabase ne sont pas validées dans cet export car vos comptes ne sont pas connectés.
8. Pour une adresse sans nom d’hébergeur, acheter/configurer votre propre domaine, l’ajouter à Render et suivre ses indications DNS. Le nom souhaité est soumis à disponibilité. Aucun domaine n’a été acheté ou changé par cet export.

## Sécurité et exploitation

L’API vérifie le rôle administrateur côté serveur et le niveau MFA, contrôle l’origine des mutations, valide les champs, limite les tentatives et utilise des requêtes SQL paramétrées. Les tables ne sont pas accessibles aux rôles navigateur Supabase. Le suivi exige un UUID aléatoire et n’expose pas les coordonnées client. Ces mesures ne remplacent pas une revue de sécurité indépendante. Configurer sauvegardes et politique de conservation des données avant ouverture.

Ne jamais partager DATABASE_URL, mot de passe ou code MFA dans une conversation. La clé publishable seule n’autorise pas l’administration.

## Commandes

`pnpm build` : compilation de production et TypeScript.
`pnpm start` : serveur de production.
`pnpm db:migrate` : migrations SQL versionnées.

La route /apercu et le fichier HTML utilisent des données fictives ; la route / utilise l’API et la base réelles. Le site précédemment publié n’est pas remplacé par ce dossier.
