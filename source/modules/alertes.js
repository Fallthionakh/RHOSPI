/* ============ Alertes : ouvrir l'action, corriger, enregistrer ============ */
const ALX={abs:['Régulariser',()=>can('pointer')],ret:['Corriger le pointage',()=>can('pointer')],ant:['Corriger le pointage',()=>can('pointer')],inc:['Saisir le départ',()=>can('pointer')],sous:['Ouvrir le pointage',()=>can('pointer')],demain:['Ouvrir le planning',()=>can('planifier')],
 dem:['Traiter la demande',()=>can('avis')||can('drh')],dmd:['Traiter la demande',()=>can('avis')||can('drh')||can('config')],exp:['Programmer le congé',()=>can('absCreer')],sol:['Programmer le congé',()=>can('absCreer')],rep:['Note de reprise',()=>true],
 av:['Voir les retards',()=>ROLES[S.profil.role].menu.includes('rapports')],nj:['Voir les absences',()=>ROLES[S.profil.role].menu.includes('rapports')],fc:['Mettre à jour le contrat',()=>can('config')],rt:['Demande de retraite',()=>ROLES[S.profil.role].menu.includes('demandes')],
 mat:['Voir le congé',()=>can('valider')],nf:['Voir les agents',()=>ROLES[S.profil.role].menu.includes('agents')]};
const alerteBtn=a=>{const x=ALX[a.key.split('|')[0]];return!a.traite&&x&&x[1]()?`<button class="btn s" data-act="alerteOuvrir" data-k="${esc(a.key)}">${x[0]}</button>`:''};
function nouvelleAbsence(agentId,du,au,type){ACT.newAbs();const a=ag(agentId),i=document.getElementById('a_ag');if(i&&a){i.value=agLabel(a)}const s=(k,v)=>{const e=document.getElementById(k);if(e&&v)e.value=v};s('a_du',du);s('a_au',au);if(type){const t=document.getElementById('a_type');if(t&&[...t.options].some(o=>o.value===type))t.value=type}soldeInfo()}
Object.assign(ACT,{
 alerteOuvrir:d=>{const[t,x,y]=d.k.split('|'),T=today();S.alerteK=d.k;
  if(t==='abs'){const a=ag(x),r=etat(x,y);return modal(`Arrivée non enregistrée — ${nomA(a)}`,`<p style="margin:0">${esc(r.vac?r.vac.nom:'Vacation')} prévue de ${hm(r.s)} à ${hm(r.e)}, le ${fdate(y)}, au service ${esc(svc(a.serviceId).nom)}. Choisissez la régularisation.</p>
   <div class="choix"><label><input type="radio" name="al_c" value="arr" checked><span><b>L'agent est présent</b><br><span class="sub">Enregistrer son arrivée à l'heure déclarée ci-dessous.</span></span></label><label><input type="radio" name="al_c" value="abs"><span><b>Absence non justifiée</b><br><span class="sub">Signaler l'absence ; elle reste régularisable.</span></span></label><label><input type="radio" name="al_c" value="just"><span><b>Absence justifiée</b><br><span class="sub">Saisir le congé, la permission ou la maladie correspondant.</span></span></label></div>
   <div class="form"><label class="field">Heure d'arrivée déclarée<input type="time" id="al_h" value="${hm(new Date())}"></label></div>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn" data-act="alAbsOk" data-id="${x}" data-d="${y}">Enregistrer</button>`)}
  if(['ret','ant','inc'].includes(t)){const p=PIX.get(x+'|'+y);if(!p)return toast('Aucun pointage trouvé pour ce jour.','err');return ACT.corr({id:p.id})}
  if(t==='sous'){S.page='pointage';S.tab='tableau';S.kSvc=x;return render()}
  if(t==='demain'){S.page='planning';S.pl.svc=x;S.pl.vue='jour';S.pl.date=y;S.week=monday(y);return render()}
  if(t==='dem'){const o=DB.absences.find(z=>z.id===x);if(!o||o.statut!=='demandée')return toast('Cette demande a déjà été traitée.','ok');if(!o.avis&&canAvis(ag(o.agentId)))return ACT.avis({t:'abs',id:x});if(peutValider(o))return ACT.absVal({id:x});return toast('La demande attend l\'avis du chef de service.','err')}
  if(t==='dmd'){const m=DB.demandes.find(z=>z.id===x);if(!m||m.statut!=='en cours')return toast('Cette demande a déjà été traitée.','ok');if(!m.avis&&canAvis(ag(m.agentId)))return ACT.avis({t:'dem',id:x});if(peutValider(m))return(m.nature||'conge')==='conge'?ACT.demDec({id:x}):ACT.demVal({id:x});return toast('La demande attend l\'avis du chef de service.','err')}
  if(t==='exp'||t==='sol'){const id=t==='exp'?y:x;return nouvelleAbsence(id,T,'','Congé administratif')}
  if(t==='rep')return ACT.reprise({id:x});
  if(t==='av'||t==='nj'){S.rap.agentId=x;S.rap.du=y;S.rap.au=T;S.page='rapports';return render()}
  if(t==='fc')return ACT.edit({k:'agent',id:x});
  if(t==='rt'){S.page='demandes';render();return ACT.demNew({nat:'retraite',ag:x})}
  if(t==='mat')return ACT.edit({k:'abs',id:x});
  if(t==='nf'){Object.keys(S.exp).forEach(k=>S.exp[k]='');S.exp.svc=x;S.exp.nonFormes=String(DB.params.formationAns);S.page='export';return render()}},
 alAbsOk:d=>{const c=(document.querySelector('input[name="al_c"]:checked')||{}).value,a=ag(d.id);
  if(c==='arr'){const h=val('al_h');if(!h)return toast('Indiquez l\'heure d\'arrivée.','err');const r=pointer(d.id,'arr',{mode:'manuel',decl:at(d.d,h)});if(!res(r))return;closeModal();return render()}
  if(c==='abs'){if(!res(signalerAbsent(d.id,d.d)))return;closeModal();return render()}
  closeModal();nouvelleAbsence(d.id,d.d,d.d,'')}
});
