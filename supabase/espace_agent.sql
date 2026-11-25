-- Espace agent : réclamations, demandes de prise en charge, documents, messages ; suivi des modifications protégé.
drop policy if exists rh_docs_lecture on public.rh_docs;
create policy rh_docs_lecture on public.rh_docs for select to authenticated
using (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and (coll not in ('m:bulletins','a:journalPaie','a:suivi') or split_part(id,'|',1) = public.rh_agent(org_id)))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and (coll not in ('a:agents','a:pointages','a:absences','a:demandes','a:decisions','m:bulletins','a:journalPaie','a:pec','a:sante','a:audit','a:corrections','a:documents','a:affectations','a:formations','a:suivi','a:messages','a:reclamations','a:pecDem')
           or (coll = 'a:agents' and id = public.rh_agent(org_id))
           or data->>'agentId' = public.rh_agent(org_id)
           or (coll = 'm:bulletins' and split_part(id,'|',1) = public.rh_agent(org_id))))
);
drop policy if exists rh_docs_ajout on public.rh_docs;
create policy rh_docs_ajout on public.rh_docs for insert to authenticated
with check (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and (coll in ('a:audit','a:suivi')
           or (coll in ('a:pointages','a:absences','a:demandes','a:reclamations','a:pecDem','a:documents') and data->>'agentId' = public.rh_agent(org_id))))
);
drop policy if exists rh_docs_modif on public.rh_docs;
create policy rh_docs_modif on public.rh_docs for update to authenticated
using (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and coll in ('a:pointages','a:absences','a:demandes','a:reclamations','a:pecDem','a:messages') and data->>'agentId' = public.rh_agent(org_id))
)
with check (
  org_id in (select public.rh_orgs_de(array['superadmin','directeur','saf','rh']))
  or (org_id in (select public.rh_orgs_de(array['chef','major']))
      and coll not in ('m:bulletins','a:journalPaie','a:rubriques','k:grille','m:paieArretee'))
  or (org_id in (select public.rh_orgs_de(array['agent']))
      and coll in ('a:pointages','a:absences','a:demandes','a:reclamations','a:pecDem','a:messages') and data->>'agentId' = public.rh_agent(org_id))
);
drop policy if exists rh_fichiers_agent_ajout on storage.objects;
create policy rh_fichiers_agent_ajout on storage.objects for insert to authenticated
with check (bucket_id = 'rh-fichiers'
  and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['agent']))
  and split_part(storage.filename(name),'_',1) = public.rh_agent((storage.foldername(name))[1]));
drop policy if exists rh_fichiers_agent_lecture on storage.objects;
create policy rh_fichiers_agent_lecture on storage.objects for select to authenticated
using (bucket_id = 'rh-fichiers'
  and (storage.foldername(name))[1] in (select public.rh_orgs_de(array['agent']))
  and (split_part(storage.filename(name),'_',1) = public.rh_agent((storage.foldername(name))[1])
       or exists (select 1 from public.rh_docs d where d.org_id = (storage.foldername(name))[1] and d.coll = 'a:documents'
                  and d.id = storage.filename(name) and d.data->>'agentId' = public.rh_agent(d.org_id))));
