-- Profils d'accès par service (projet FAMMSIM) : chaque compte ne voit que les données
-- des services auxquels il est rattaché. Appliqué le 22/11/2026.
create table if not exists public.acces_services(
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('imagerie','neurochirurgie','odontologie','orl','diabetologie','cpn','urgences')),
  role text not null default 'saisie' check (role in ('lecture','saisie','responsable')),
  nom text not null default '', email text, actif boolean not null default true,
  cree_le timestamptz not null default now(), primary key(user_id, service));
create or replace function public.acces_role(p_service text) returns text
language sql stable security definer set search_path = '' as $$
  select a.role from public.acces_services a where a.user_id = auth.uid() and a.service = p_service and a.actif $$;
-- Imagerie : fiches et paramètres réservés aux comptes du service
-- (lecture : tout rattaché ; saisie : saisie et responsable ; suppression et paramètres : responsable).
-- RHOSPI : bulletins de paie réservés à la direction, au SAF et aux RH, ou à l'agent lui-même.
-- Voir le détail dans l'historique des migrations Supabase : acces_par_service_imagerie_rh.
