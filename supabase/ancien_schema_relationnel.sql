-- POINTVIEW — modèle de données PostgreSQL / Supabase (phase 1)
-- Tout est créé dans un schéma dédié « pointview » : aucune table existante n'est modifiée.
-- NON APPLIQUÉ : à exécuter après choix du projet Supabase.

create schema if not exists pointview;
set search_path = pointview, public;

-- ---------- Structure ----------
create table etablissements (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  fuseau text not null default 'Africa/Dakar',
  cree_le timestamptz not null default now()
);
create table poles (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id),
  nom text not null
);
create table services (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id),
  pole_id uuid references poles(id),
  code text not null,
  nom text not null,
  type text not null check (type in ('soins','médico-technique','administratif','technique')),
  responsable_id uuid,            -- agents(id), ajouté plus bas
  major_id uuid,
  effectif_theorique int not null default 0,
  effectif_minimum int not null default 0,
  actif boolean not null default true,
  jeton_qr uuid not null default gen_random_uuid(),   -- identifiant opaque porté par le QR code
  unique (etablissement_id, code)
);
create table unites (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  nom text not null
);
create table postes (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id),
  code text not null,
  intitule text not null,
  categorie text, corps text, description text, type_horaires text,
  actif boolean not null default true,
  unique (etablissement_id, code)
);

-- ---------- Agents et dossier ----------
create table agents (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id),
  matricule text not null,
  prenom text not null, nom text not null,
  sexe text check (sexe in ('F','M')),
  date_naissance date, telephone text, email text, adresse text, photo_url text,
  corps text, categorie text, grade text, statut_administratif text,
  date_entree_corps date, date_prise_service date,
  service_id uuid references services(id),      -- affectation courante (dénormalisée)
  poste_id uuid references postes(id),
  situation text not null default 'en activité'
    check (situation in ('en activité','en congé','en détachement','en disponibilité','sorti des effectifs')),
  pin_hash text,                                -- PIN de pointage, jamais en clair (crypt/bcrypt)
  utilisateur_id uuid references auth.users(id),
  unique (etablissement_id, matricule)
);
alter table services add foreign key (responsable_id) references agents(id);
alter table services add foreign key (major_id) references agents(id);

create table affectations (               -- historique : jamais supprimé, seulement clôturé
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  service_id uuid not null references services(id),
  unite_id uuid references unites(id),
  poste_id uuid not null references postes(id),
  nature text not null default 'administrative' check (nature in ('administrative','temporaire')),
  date_debut date not null, date_fin date,
  check (date_fin is null or date_fin >= date_debut)
);
create unique index une_affectation_ouverte on affectations(agent_id) where date_fin is null and nature = 'administrative';
create table mouvements (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  ancien_service_id uuid references services(id), nouveau_service_id uuid references services(id),
  ancien_poste_id uuid references postes(id),     nouveau_poste_id uuid references postes(id),
  date_debut date not null, date_fin date,
  motif text not null, reference_administrative text,
  enregistre_par uuid references auth.users(id),
  enregistre_le timestamptz not null default now()
);

-- ---------- Comptes et droits ----------
create table roles (code text primary key, libelle text not null);
insert into roles values ('superadmin','Super administrateur'),('directeur','Directeur'),('saf','Chef SAF'),
  ('rh','Chef RH'),('chef_service','Chef de service'),('major','Major'),('agent','Agent');
create table utilisateurs (
  id uuid primary key references auth.users(id),
  etablissement_id uuid not null references etablissements(id),
  agent_id uuid references agents(id),
  role text not null references roles(code),
  actif boolean not null default true
);
create table habilitations (               -- périmètre d'un chef de service ou d'un major
  utilisateur_id uuid not null references utilisateurs(id),
  service_id uuid not null references services(id),
  primary key (utilisateur_id, service_id)
);

-- ---------- Planning ----------
create table horaires (                    -- types de vacations, entièrement paramétrables
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null references etablissements(id),
  code text not null, libelle text not null,
  heure_debut time, heure_fin time,        -- fin <= début : la vacation se termine le lendemain
  pause_minutes int not null default 0,
  compte_comme_travail boolean not null default true,
  unique (etablissement_id, code)
);
create table plannings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  date_debut date not null, date_fin date not null,
  statut text not null default 'brouillon' check (statut in ('brouillon','validé')),
  valide_par uuid references auth.users(id), valide_le timestamptz
);
create table vacations (                   -- une ligne = un agent, un jour, un horaire
  id uuid primary key default gen_random_uuid(),
  planning_id uuid references plannings(id),
  agent_id uuid not null references agents(id),
  service_id uuid not null references services(id),
  horaire_id uuid not null references horaires(id),
  jour date not null,                      -- jour de DÉBUT de la vacation
  debut_prevu timestamptz not null, fin_prevue timestamptz not null,
  remplace_agent_id uuid references agents(id),
  unique (agent_id, jour),
  check (fin_prevue > debut_prevu)
);
create table jours_feries (etablissement_id uuid references etablissements(id), jour date, libelle text, primary key (etablissement_id, jour));

-- ---------- Pointage (données brutes, jamais modifiées) ----------
create table pointages (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  service_id uuid not null references services(id),
  vacation_id uuid references vacations(id),
  type text not null check (type in ('arrivee','depart','absence_signalee')),
  heure_declaree timestamptz not null,                 -- heure de présence
  heure_enregistrement timestamptz not null default now(),  -- heure serveur, non modifiable
  mode text not null check (mode in ('qr','manuel')),
  saisi_par uuid references auth.users(id),
  observation text
);
create unique index pas_de_doublon on pointages(vacation_id, type) where vacation_id is not null;
create table corrections (                 -- donnée validée = brut + dernière correction
  id uuid primary key default gen_random_uuid(),
  pointage_id uuid not null references pointages(id),
  ancienne_heure timestamptz, nouvelle_heure timestamptz,
  motif text not null check (length(trim(motif)) > 0),
  corrige_par uuid not null references auth.users(id),
  corrige_le timestamptz not null default now()
);

-- ---------- Absences ----------
create table absences (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  service_id uuid not null references services(id),
  type text not null,
  debut timestamptz not null, fin timestamptz not null,
  motif text not null, justificatif_url text,
  statut text not null default 'demandée' check (statut in ('demandée','approuvée','rejetée','annulée')),
  justifiee boolean not null default true,
  enregistre_par uuid references auth.users(id),
  cree_le timestamptz not null default now(),
  check (fin >= debut)
);
create table validations (                 -- circuit de validation et régularisations, historisés
  id uuid primary key default gen_random_uuid(),
  absence_id uuid not null references absences(id),
  decision text not null, commentaire text,
  decide_par uuid not null references auth.users(id),
  decide_le timestamptz not null default now()
);

-- ---------- Alertes et audit ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, priorite text not null check (priorite in ('haute','moyenne','basse')),
  agent_id uuid references agents(id), service_id uuid references services(id),
  message text not null, destinataire_id uuid references auth.users(id),
  statut text not null default 'à traiter' check (statut in ('à traiter','traitée')),
  traite_par uuid references auth.users(id), traite_le timestamptz,
  cree_le timestamptz not null default now()
);
create table journaux_audit (
  id bigint generated always as identity primary key,
  utilisateur_id uuid references auth.users(id),
  action text not null, table_cible text, ligne_id uuid, detail jsonb,
  horodatage timestamptz not null default now()
);
create table parametres (
  etablissement_id uuid primary key references etablissements(id),
  tolerance_retard_min int not null default 10,
  delai_absent_presume_min int not null default 30,
  seuil_depart_anticipe_min int not null default 10,
  delai_pointage_incomplet_min int not null default 60,
  seuil_saisie_tardive_min int not null default 15,
  verification_pointage text not null default 'pin' check (verification_pointage in ('pin','compte','responsable')),
  qr_dynamique boolean not null default false, qr_validite_sec int not null default 60
);

-- ---------- Sécurité : RLS partout, écriture des pointages par fonction serveur ----------
create or replace function mon_role() returns text language sql stable security definer set search_path = pointview
  as $$ select role from utilisateurs where id = auth.uid() and actif $$;
create or replace function service_autorise(s uuid) returns boolean language sql stable security definer set search_path = pointview
  as $$ select mon_role() in ('superadmin','directeur','saf','rh')
        or exists (select 1 from habilitations where utilisateur_id = auth.uid() and service_id = s) $$;

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'pointview' loop
    execute format('alter table pointview.%I enable row level security', t);
  end loop; end $$;

create policy lecture_services  on services  for select to authenticated using (true);
create policy lecture_postes    on postes    for select to authenticated using (true);
create policy lecture_horaires  on horaires  for select to authenticated using (true);
create policy lecture_agents    on agents    for select to authenticated using (service_autorise(service_id) or utilisateur_id = auth.uid());
create policy gestion_agents    on agents    for all    to authenticated using (mon_role() in ('superadmin','rh')) with check (mon_role() in ('superadmin','rh'));
create policy lecture_vacations on vacations for select to authenticated using (service_autorise(service_id) or agent_id in (select id from agents where utilisateur_id = auth.uid()));
create policy gestion_vacations on vacations for all    to authenticated using (mon_role() in ('superadmin','chef_service','major') and service_autorise(service_id)) with check (service_autorise(service_id));
create policy lecture_pointages on pointages for select to authenticated using (service_autorise(service_id) or agent_id in (select id from agents where utilisateur_id = auth.uid()));
-- Aucune politique insert/update/delete sur pointages : seule la fonction pointer() ci-dessous écrit, avec now() du serveur.
create policy lecture_absences  on absences  for select to authenticated using (service_autorise(service_id) or agent_id in (select id from agents where utilisateur_id = auth.uid()));
create policy lecture_audit     on journaux_audit for select to authenticated using (mon_role() in ('superadmin','directeur'));
-- Les autres politiques (corrections, validations, notifications, mouvements…) suivent le même principe et seront ajoutées module par module.

-- Pointage par QR : appelable sans compte, mais exige le jeton du service + matricule + PIN.
create or replace function pointer(p_jeton uuid, p_matricule text, p_pin text, p_type text)
returns jsonb language plpgsql security definer set search_path = pointview, extensions as $$
declare a agents; s services; v vacations; begin
  select * into s from services where jeton_qr = p_jeton and actif;
  if not found then return jsonb_build_object('ok', false, 'msg', 'QR code invalide.'); end if;
  select * into a from agents where etablissement_id = s.etablissement_id and matricule = p_matricule;
  if not found or a.pin_hash is null or a.pin_hash <> crypt(p_pin, a.pin_hash) then
    insert into journaux_audit(action, detail) values ('anomalie_pointage', jsonb_build_object('matricule', p_matricule, 'service', s.id));
    return jsonb_build_object('ok', false, 'msg', 'Matricule ou code PIN incorrect.');
  end if;
  if a.service_id <> s.id then return jsonb_build_object('ok', false, 'msg', 'Agent non autorisé sur ce service.'); end if;
  select * into v from vacations where agent_id = a.id and debut_prevu - interval '3 hours' <= now() and now() <= fin_prevue + interval '6 hours'
    order by debut_prevu desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Aucune vacation programmée.'); end if;
  if p_type = 'depart' and not exists (select 1 from pointages where vacation_id = v.id and type = 'arrivee') then
    return jsonb_build_object('ok', false, 'msg', 'Aucune arrivée enregistrée.'); end if;
  insert into pointages(agent_id, service_id, vacation_id, type, heure_declaree, mode)
    values (a.id, s.id, v.id, p_type, now(), 'qr');
  return jsonb_build_object('ok', true, 'heure', now(), 'agent', a.prenom || ' ' || a.nom);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'msg', 'Pointage déjà enregistré.');
end $$;
revoke all on function pointer(uuid, text, text, text) from public;
grant execute on function pointer(uuid, text, text, text) to anon, authenticated;
