# RHOSPI — SENHOP RH

Gestion des ressources humaines hospitalières : agents, pointage et présences, planning et gardes, congés et décisions, circuit de validation, paie, prises en charge, bilan social, formation, santé au travail.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `public/` | Version en ligne, à héberger sur Cloudflare (reliée à Supabase). |
| `wrangler.jsonc` | Configuration Cloudflare (site statique). |
| `supabase/rhospi_supabase.sql` | Tables, règles d'accès et fonctions de synchronisation (projet Supabase FAMMSIM). |
| `supabase/functions/rh-admin/` | Fonction de création et de gestion des comptes d'accès. |
| `source/index-artefact.html` | Version autonome (données sur l'appareil), publiée comme artefact Claude. |
| `source/modules/` | Modules intégrés dans la page (paie, congés, présence, synchronisation `cloud.js`…). |
| `tests/` | Tests automatiques (Node et Playwright). |

## Données

- Une ligne par enregistrement (agent, pointage, case de planning…) dans `rh_docs`, par organisation.
- Chaque appareil garde une copie locale et ne télécharge que les changements.
- Accès par profil : super administrateur, directeur, SAF, RH, chef de service, major, agent.

## Mise en ligne

- **Cloudflare** : publier le dossier `public/` (Pages › Upload assets, ou `npx wrangler deploy`).
- **Supabase** : appliquer `supabase/rhospi_supabase.sql`, déployer `supabase/functions/rh-admin`.
