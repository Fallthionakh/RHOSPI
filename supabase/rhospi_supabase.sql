-- RHOSPI / SENHOP RH sur Supabase (projet FAMMSIM)
-- Stockage par enregistrement (une ligne par agent, pointage, absence, case de planning…),
-- synchronisation par différences : chaque appareil ne télécharge que ce qui a changé.

create table if not exists public.rh_orgs(
  id text primary key,
  nom text not null,
  cree_le timestamptz not null default now(),
  cree_par uuid default auth.uid()
);

create table if not exists public.rh_membres(
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id text not null references public.rh_orgs(id) on delete cascade,
  role text not null check (role in ('superadmin','directeur','saf','rh','chef','major','agent')),
  agent_id text,
  nom text not null default '',
  email text,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  primary key(user_id, org_id)
);
create index if not exists rh_membres_org on public.rh_membres(org_id);

create table if not exists public.rh_docs(
  org_id text not null references public.rh_orgs(id) on delete cascade,
  coll text not null,
  id text not null,
  data jsonb,
  supprime boolean not null default false,
  maj timestamptz not null default clock_timestamp(),
  maj_par uuid,
  primary key(org_id, coll, id)
);
-- Index de synchronisation : « tout ce qui a changé depuis… » sans parcourir la table.
create index if not exists rh_docs_sync on public.rh_docs(org_id, maj, coll, id);

create or replace function public.rh_docs_horodatage() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.maj := clock_timestamp();
  new.maj_par := auth.uid();
  return new;
end $$;
drop trigger if exists rh_docs_horodatage on public.rh_docs;
create trigger rh_docs_horodatage before insert or update on public.rh_docs
for each row execute function public.rh_docs_horodatage();

-- Rôle et agent de l'utilisateur connecté dans une organisation (lecture directe par clé primaire).
create or replace function public.rh_role(p_org text) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.rh_membres m where m.user_id = auth.uid() and m.org_id = p_org and m.actif
$$;
create or replace function public.rh_agent(p_org text) returns text
language sql stable security definer set search_path = '' as $$
  select m.agent_id from public.rh_membres m where m.user_id = auth.uid() and m.org_id = p_org and m.actif
$$;
create or replace function public.rh_orgs_de(p_roles text[]) returns setof text
language sql stable security definer set search_path = '' as $$
  select m.org_id from public.rh_membres m where m.user_id = auth.uid() and m.actif and m.role = any(p_roles)
$$;

alter table public.rh_orgs enable row level security;
alter table public.rh_membres enable row level security;
alter table public.rh_docs enable row level security;

-- Organisations : visibles par leurs membres.
drop policy if exists rh_orgs_lecture on public.rh_orgs;
create policy rh_orgs_lecture on public.rh_orgs for select to authenticated
using (id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh','chef','major','agent'])));

-- Comptes : chacun voit le sien ; la direction et les RH voient ceux de leur organisation.
-- Création et modification uniquement par la fonction rh-admin (clé de service).
drop policy if exists rh_membres_lecture on public.rh_membres;
create policy rh_membres_lecture on public.rh_membres for select to authenticated
using (user_id = (select auth.uid()) or org_id in (select public.rh_orgs_de(array['superadmin','directeur','rh'])));

-- Données : lecture par les membres. Un agent ne voit que ses propres éléments sensibles.
drop policy if exists rh_docs_lecture on public.rh_docs;
create policy rh_docs_lecture on public.rh_docs for select to authenticated
using (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh','chef','major']))
  or (
    org_id in (select public.rh_orgs_de(array['agent']))
    and (
      coll not in ('a:agents','a:pointages','a:absences','a:demandes','a:decisions','m:bulletins','a:journalPaie','a:pec','a:sante','a:audit','a:corrections','a:documents','a:affectations','a:formations','k:grille','a:rubriques')
      or (coll = 'a:agents' and id = public.rh_agent(org_id))
      or data->>'agentId' = public.rh_agent(org_id)
      or (coll = 'm:bulletins' and split_part(id, '|', 1) = public.rh_agent(org_id))
    )
  )
);

-- Écriture : direction, SAF et RH partout ; chef et major hors paie ; agent : ses pointages, absences et demandes.
drop policy if exists rh_docs_ajout on public.rh_docs;
create policy rh_docs_ajout on public.rh_docs for insert to authenticated
with check (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and (coll = 'a:audit' or (coll in ('a:pointages','a:absences','a:demandes') and data->>'agentId' = public.rh_agent(org_id))))
);
drop policy if exists rh_docs_modif on public.rh_docs;
create policy rh_docs_modif on public.rh_docs for update to authenticated
using (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and coll in ('a:pointages','a:absences','a:demandes') and data->>'agentId' = public.rh_agent(org_id))
)
with check (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and coll in ('a:pointages','a:absences','a:demandes') and data->>'agentId' = public.rh_agent(org_id))
);
-- Pas de suppression physique depuis l'application : les suppressions sont marquées (traçabilité).

-- Lecture des changements depuis un repère, par lots, en un seul aller-retour.
create or replace function public.rh_pull(p_org text, p_maj timestamptz, p_coll text, p_id text, p_lim int default 5000)
returns jsonb language sql stable set search_path = '' as $$
  with r as (
    select d.coll, d.id, d.data, d.supprime, d.maj
    from public.rh_docs d
    where d.org_id = p_org and (d.maj, d.coll, d.id) > (p_maj, p_coll, p_id)
    order by d.maj, d.coll, d.id
    limit least(greatest(p_lim, 1), 10000)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_array(r.coll, r.id, case when r.supprime then null else r.data end, r.supprime, r.maj) order by r.maj, r.coll, r.id) from r), '[]'::jsonb),
    'n', (select count(*) from r),
    'now', clock_timestamp()
  )
$$;

-- Envoi groupé : jusqu'à plusieurs centaines d'enregistrements en une requête.
create or replace function public.rh_push(p_org text, p_rows jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare n int;
begin
  insert into public.rh_docs(org_id, coll, id, data, supprime)
  select p_org, x->>0, x->>1, case when coalesce((x->>3)::boolean, false) then null else x->2 end, coalesce((x->>3)::boolean, false)
  from jsonb_array_elements(p_rows) x
  on conflict (org_id, coll, id) do update set data = excluded.data, supprime = excluded.supprime;
  get diagnostics n = row_count;
  return jsonb_build_object('n', n, 'now', clock_timestamp());
end $$;

-- Création d'une organisation par un super administrateur (ou premier utilisateur).
create or replace function public.rh_org_creer(p_nom text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id text;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if trim(coalesce(p_nom,'')) = '' then raise exception 'Nom requis'; end if;
  if exists (select 1 from public.rh_membres) and not exists (
    select 1 from public.rh_membres m where m.user_id = auth.uid() and m.role = 'superadmin' and m.actif) then
    raise exception 'Réservé au super administrateur';
  end if;
  v_id := 'o' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
  insert into public.rh_orgs(id, nom) values (v_id, trim(p_nom));
  insert into public.rh_membres(user_id, org_id, role, nom, email)
  select auth.uid(), v_id, 'superadmin', coalesce(u.raw_user_meta_data->>'nom', ''), u.email from auth.users u where u.id = auth.uid();
  return v_id;
end $$;

revoke all on function public.rh_org_creer(text) from public, anon;
grant execute on function public.rh_org_creer(text) to authenticated;
revoke all on function public.rh_pull(text, timestamptz, text, text, int) from public, anon;
grant execute on function public.rh_pull(text, timestamptz, text, text, int) to authenticated;
revoke all on function public.rh_push(text, jsonb) from public, anon;
grant execute on function public.rh_push(text, jsonb) to authenticated;
revoke all on function public.rh_role(text), public.rh_agent(text), public.rh_orgs_de(text[]) from public, anon;
grant execute on function public.rh_role(text), public.rh_agent(text), public.rh_orgs_de(text[]) to authenticated;
revoke all on public.rh_orgs, public.rh_membres, public.rh_docs from anon;

-- Pièces jointes (documents, photos) : dossier par organisation, accès réservé à l'encadrement.
insert into storage.buckets(id, name, public, file_size_limit)
values ('rh-fichiers', 'rh-fichiers', false, 10485760) on conflict (id) do nothing;
drop policy if exists rh_fichiers_lecture on storage.objects;
create policy rh_fichiers_lecture on storage.objects for select to authenticated
using (bucket_id = 'rh-fichiers' and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh','chef','major'])));
drop policy if exists rh_fichiers_ajout on storage.objects;
create policy rh_fichiers_ajout on storage.objects for insert to authenticated
with check (bucket_id = 'rh-fichiers' and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh','chef','major'])));
drop policy if exists rh_fichiers_modif on storage.objects;
create policy rh_fichiers_modif on storage.objects for update to authenticated
using (bucket_id = 'rh-fichiers' and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh','chef','major'])));
drop policy if exists rh_fichiers_suppr on storage.objects;
create policy rh_fichiers_suppr on storage.objects for delete to authenticated
using (bucket_id = 'rh-fichiers' and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh'])));

-- Organisation de départ et super administrateur.
insert into public.rh_orgs(id, nom) values ('thies', 'Hôpital Régional de Thiès') on conflict do nothing;
insert into public.rh_membres(user_id, org_id, role, nom, email)
select u.id, 'thies', 'superadmin', 'Super administrateur', u.email from auth.users u where lower(u.email) = 'wommatsn@gmail.com'
on conflict do nothing;
