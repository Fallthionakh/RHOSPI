-- Annuaire limité : un agent obtient le nom, le poste et le téléphone des collègues de SON service (rien d'autre).
create or replace function public.rh_collegues(p_org text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with moi as (
    select d.data->>'serviceId' as svc from public.rh_docs d
    where d.org_id = p_org and d.coll = 'a:agents' and d.id = public.rh_agent(p_org) and not coalesce(d.supprime,false)
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'prenom',d.data->>'prenom','nom',d.data->>'nom','tel',d.data->>'tel',
           'posteId',d.data->>'posteId','fonctionId',d.data->>'fonctionId','serviceId',d.data->>'serviceId') order by d.data->>'nom'),'[]'::jsonb)
  from public.rh_docs d, moi
  where p_org in (select public.rh_orgs_de(array['agent','superadmin','directeur','saf','rh','chef','major']))
    and d.org_id = p_org and d.coll = 'a:agents' and not coalesce(d.supprime,false)
    and d.data->>'serviceId' = moi.svc
    and coalesce(d.data->>'situation','') <> 'sorti des effectifs';
$$;
revoke all on function public.rh_collegues(text) from public, anon;
grant execute on function public.rh_collegues(text) to authenticated;
