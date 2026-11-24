/* ============ Attribution des rubriques : en masse (catégorie, type de contrat, statut) et par agent ; fonctionnaires ============ */
const raMatch=(a,g)=>(!g.cats.length||g.cats.includes(a.posteId))&&(!g.contrats.length||g.contrats.includes(a.typeContrat||''))&&(!g.statuts.length||g.statuts.includes(a.statut||''))&&(!(g.univs||[]).length||g.univs.includes(a.univ||''));
/* Une rubrique s'applique-t-elle à l'agent ? Choix propre à l'agent > dernière règle qui le vise > oui */
function rubEtat(a,r){const o=(a.rubOn||{})[r.id];if(o===true||o===false)return{on:o,src:'agent'};
 const R=(DB.rubRegles||[]).slice().reverse().find(g=>g.rubs[r.id]&&raMatch(a,g));return R?{on:R.rubs[r.id].on,src:'regle',regle:R}:{on:true,src:'defaut'}}
const rubApplique=(a,r)=>rubEtat(a,r).on;
/* Montant : propre à l'agent > montant d'une règle > grilles */
const sourceRubRA=sourceRub;
sourceRub=function(a,r){const k=LEG[r.id],o=k?a[k]:(a.paie||{})[r.id];if(estDef(o))return{v:+o||0,src:'propre'};
 const R=(DB.rubRegles||[]).slice().reverse().find(g=>g.rubs[r.id]&&g.rubs[r.id].on&&estDef(g.rubs[r.id].v)&&raMatch(a,g));if(R)return{v:+R.rubs[r.id].v,src:'regle'};return sourceRubRA(a,r)};
SRCL.regle='règle d\'attribution';

bulletin=function(a,ym){const rec=DB.bulletins[a.id+'|'+ym],{du,au}=moisBornes(ym),S1=l=>l.reduce((t,g)=>t+g[1],0);
 if(rec){const gains=rec.lignes.filter(l=>l.type==='gain').map(l=>[l.nom,+l.montant||0,l.rubId||'',null]),ret=rec.lignes.filter(l=>l.type==='retenue').map(l=>[l.nom,+l.montant||0,l.rubId||'',l.pct??null,!!l.manuel]),brut=S1(gains),retenues=S1(ret);
  return{gains:gains.length?gains:[['Salaire de base',0,'base',null]],brut,ret,retenues,net:brut-retenues,ng:rec.ng||0,actif:true,statut:rec.statut,rec}}
 const rb=DB.rubriques.find(r=>r.id==='base'),baseOn=rubApplique(a,rb),enEff=(a.entree||'0')<=au&&(!a.dateDepart||a.dateDepart>=du);
 const rs=DB.rubriques.filter(r=>r.actif!==false&&r.id!=='base'&&rubApplique(a,r)),ng=enEff?gardesEntre(a,du,au):0;
 let gains=[];if(enEff){const bv=baseOn?valRub(a,rb):0;
  const autres=rs.filter(r=>r.type==='gain').map(r=>r.id==='garde'?[`${r.nom} (${ng} garde${ng>1?'s':''})`,ng*valRub(a,r),r.id,null]:[r.nom,valRub(a,r),r.id,null]).filter(g=>g[1]>0||g[2]==='garde');
  if(baseOn?bv>0:autres.some(g=>g[1]>0))gains=[[baseOn?rb.nom:(estFonctionnaire(a)?'Salaire de base (versé par l\'État)':'Salaire de base (non versé)'),bv,'base',null],...autres]}
 const brut=S1(gains),L=brut?paieLegale(a,brut,montantRub({gains},'base')):null;
 const ret=!brut?[]:rs.filter(r=>r.type==='retenue').flatMap(r=>{const s=sourceRub(a,r);
  if(r.mode==='legal'){if(s.src==='propre'||s.src==='regle')return[[r.nom,s.v,r.id,null]];return(L.ret[r.id]||[]).map(([n,v])=>[n,v,r.id,null])}
  const v=s.v;return[r.mode==='pct'?[`${r.nom} (${String(v).replace('.',',')} %)`,Math.round(brut*v/100),r.id,v]:[r.nom,v,r.id,null]]}).filter(g=>g[1]>0),retenues=S1(ret);
 return{gains,brut,ret,retenues,net:brut-retenues,ng,actif:!!brut,statut:'calculé',legal:L,baseOn}};
remSources=(f=>a=>f(a).filter(Boolean))(a=>DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false).map(r=>{if(!rubApplique(a,r))return r.id==='base'?[r.nom,estFonctionnaire(a)?'versé par l\'État (fonctionnaire)':'non attribué']:null;const s=sourceRub(a,r);return s.v||r.id==='base'?[r.nom+(r.id==='garde'?' (par garde)':''),`${fcfa(s.v)} · ${s.src==='poste'?'poste':s.src==='cat'?'catégorie':SRCL[s.src]}`]:null}));

/* ---------- Migration : les fonctionnaires ne sont pas payés par l'établissement ---------- */
const migrateRA=migrate;
migrate=function(db){migrateRA(db);db.rubRegles=db.rubRegles||[];
 if(!db.rubFonc1){db.rubFonc1=1;db.rubRegles.unshift({id:'fonc',t:new Date().toISOString(),par:'Paramétrage initial',nom:'Fonctionnaires : salaire versé par l\'État',cats:[],contrats:[],statuts:['Fonctionnaire'],rubs:Object.fromEntries(['base','ipres','ipm','impot','trimf'].map(id=>[id,{on:false}]))})}
 return db};

/* ---------- Écran ---------- */
const raDesc=g=>{const p=[];if(g.cats.length)p.push('Catégorie : '+g.cats.map(id=>(poste(id)||{nom:id}).nom).join(', '));if(g.contrats.length)p.push('Contrat : '+g.contrats.map(c=>c||'non renseigné').join(', '));if(g.statuts.length)p.push('Statut : '+g.statuts.join(', '));if((g.univs||[]).length)p.push('Statut universitaire : '+g.univs.map(c=>c||'non renseigné').join(', '));return p.length?p.join(' · '):'Tous les agents'};
const raCible=()=>({cats:[...document.querySelectorAll('.ra_cat:checked')].map(c=>c.value),contrats:[...document.querySelectorAll('.ra_ct:checked')].map(c=>c.value),statuts:[...document.querySelectorAll('.ra_st:checked')].map(c=>c.value),univs:[...document.querySelectorAll('.ra_un:checked')].map(c=>c.value)});
const raAgents=g=>DB.agents.filter(a=>enPoste(a,today())&&raMatch(a,g));
function raPage(e){const dis=e?'':' disabled',T=today(),A=S.rem.raAg&&ag(S.rem.raAg),rubs=DB.rubriques.filter(r=>r.actif!==false);
 const cases=(cls,items)=>`<div class="row" style="gap:6px 14px">${items.map(([v,l,n])=>`<label class="row" style="gap:5px"><input type="checkbox" class="${cls}" value="${esc(v)}" data-chg="raCompte"${dis}> ${esc(l)} <span class="sub">(${n})</span></label>`).join('')}</div>`;
 const act=DB.agents.filter(a=>enPoste(a,T)),nb=f=>act.filter(f).length;
 const contrats=[...new Set([...DB.listes.typesContrat,...act.map(a=>a.typeContrat||'')])];
 const regles=(DB.rubRegles||[]).slice().reverse();
 const lgn=r=>`<tr><td><b>${esc(r.nom)}</b>${r.mode==='legal'?' <span class="sub">(calcul légal)</span>':''}</td><td><select id="ra_r_${r.id}"${dis}><option value="">Ne pas changer</option><option value="on">Attribuer</option><option value="off">Retirer</option></select></td><td>${r.mode==='pct'||r.id==='garde'&&false?'':`<input type="number" min="0" step="500" id="ra_v_${r.id}" placeholder="${r.mode==='legal'?'calcul légal':'grille'}" style="width:130px" aria-label="Montant"${dis}>`}</td></tr>`;
 let agentHTML='';if(A){agentHTML=table(['Rubrique','S\'applique ?','D\'où vient ce choix','Choix pour cet agent','Montant propre (FCFA)'],DB.rubriques.filter(r=>r.actif!==false).map(r=>{const s=rubEtat(A,r),k=LEG[r.id],o=k?A[k]:(A.paie||{})[r.id],cur=(A.rubOn||{})[r.id];
  return`<tr><td><b>${esc(r.nom)}</b><br><span class="sub">${r.type==='gain'?'gain':'retenue'}</span></td><td>${s.on?'<span class="pill ok">oui</span>':'<span class="pill crit">non</span>'}</td><td class="sub">${s.src==='agent'?'choix propre à l\'agent':s.src==='regle'?'règle : '+esc(s.regle.nom||raDesc(s.regle)):s.src==='rub'?esc(s.why):'par défaut'}</td>
  <td><select data-chg="raAgOn" data-r="${r.id}"${dis}><option value=""${cur===undefined?' selected':''}>Suivre les règles</option><option value="on"${cur===true?' selected':''}>Attribuer</option><option value="off"${cur===false?' selected':''}>Retirer</option></select></td>
  <td>${r.mode==='pct'?'—':`<input type="number" min="0" step="500" style="width:120px" data-chg="raAgV" data-r="${r.id}" value="${estDef(o)?o:''}" placeholder="${r.mode==='legal'?'calcul légal':num(valGrille(DB,A,r).v)}" aria-label="Montant propre"${dis}>`}</td></tr>`}))}
 return`<div class="card" style="border-left:4px solid var(--bleu)"><h2>5 · Attribuer ou retirer des rubriques en masse</h2><div class="sub" style="margin-bottom:10px">Choisissez les agents visés (une ou plusieurs catégories, et/ou types de contrat, et/ou statuts administratifs ou universitaires : les agents doivent remplir chaque critère coché ; rien de coché dans un groupe = tous), puis les rubriques à attribuer ou à retirer. La règle s'applique aussi aux agents ajoutés plus tard. La règle la plus récente l'emporte ; le choix fait pour un agent passe avant toutes les règles.</div>
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px"><div><b>Catégories socio-professionnelles</b>${cases('ra_cat',DB.postes.map(p=>[p.id,p.nom,nb(a=>a.posteId===p.id)]))}</div><div><b>Types de contrat</b> ${e?'<button class="btn g s" data-act="addList" data-kind="contrat">+ Ajouter</button>':''}${cases('ra_ct',contrats.map(c=>[c,c||'non renseigné',nb(a=>(a.typeContrat||'')===c)]))}</div><div><b>Statuts administratifs</b>${cases('ra_st',DB.listes.statuts.map(s=>[s,s,nb(a=>a.statut===s)]))}</div><div><b>Statut universitaire</b> ${e?'<button class="btn g s" data-act="addList" data-kind="univ">+ Ajouter</button>':''}${cases('ra_un',[...DB.listes.statutsUniv.map(u=>[u,u,nb(a=>(a.univ||'')===u)]),['','non renseigné',nb(a=>!a.univ)]])}</div></div>
 <div class="demo" id="ra_n" style="margin:12px 0;background:var(--bleu-pale);border-color:#c5dbf2;color:var(--encre)">Agents concernés : <b>${act.length}</b> (tous les agents en poste)</div>
 ${table(['Rubrique','Action','Montant (vide = grille ou calcul légal)'],rubs.map(lgn))}
 <div class="form" style="margin-top:10px"><label class="field">Nom de la règle (facultatif)<input id="ra_nom" placeholder="ex. Prime de risque pour les CDD"${dis}></label><div class="field"><span>&nbsp;</span>${e?'<button class="btn" data-act="raAppliquer">Appliquer la règle</button>':''}</div></div>
 <h3 style="margin:16px 0 6px">Règles en vigueur (${regles.length})</h3>${table(['Règle','Agents visés','Rubriques','Agents concernés','Créée',''],regles.map(g=>`<tr><td><b>${esc(g.nom||'—')}</b></td><td>${esc(raDesc(g))}</td><td>${Object.entries(g.rubs).map(([id,x])=>{const r=DB.rubriques.find(z=>z.id===id);return`<span class="pill ${x.on?'ok':'crit'}">${x.on?'+':'−'} ${esc(r?r.nom:id)}${x.on&&estDef(x.v)?' : '+num(x.v):''}</span>`}).join(' ')}</td><td>${raAgents(g).length}</td><td class="sub">${fdt(g.t)}<br>${esc(g.par||'')}</td><td>${e?`<button class="btn r s" data-act="raDel" data-id="${g.id}">Supprimer</button>`:''}</td></tr>`),'Aucune règle : toutes les rubriques actives s\'appliquent à tous les agents.')}</div>
 <div class="card"><h2>6 · Rubriques d'un agent</h2><div class="sub" style="margin-bottom:8px">Attribuez ou retirez une rubrique à un agent précis, et fixez son montant propre.</div><div class="row" style="margin-bottom:10px">${agPick('ra_ag',DB.agents.filter(a=>enPoste(a,T)),S.rem.raAg||'','data-chg="raAg" style="min-width:280px"','Rechercher un agent')}${A?`<span class="sub">${esc(poste(A.posteId).nom)} · ${esc(A.typeContrat||'contrat non renseigné')} · ${esc(A.statut||'')}${A.univ?' · '+esc(A.univ):''}</span>`:''}</div>${A?agentHTML:'<div class="empty">Choisissez un agent.</div>'}</div>`}
rubPage=(f=>e=>f(e)+raPage(e))(rubPage);
Object.assign(CHG,{
 raCompte:()=>{const g=raCible(),n=raAgents(g).length,el=document.getElementById('ra_n');if(el)el.innerHTML=`Agents concernés : <b>${n}</b> — ${esc(raDesc(g))}`},
 raAg:el=>{const id=pickId('ra_ag');S.rem.raAg=id;render()},
 raAgOn:el=>{const a=ag(S.rem.raAg),r=DB.rubriques.find(x=>x.id===el.dataset.r);a.rubOn=a.rubOn||{};if(el.value==='')delete a.rubOn[r.id];else a.rubOn[r.id]=el.value==='on';if(!Object.keys(a.rubOn).length)delete a.rubOn;
  jp(a.id,'','Rubrique de l\'agent',`${r.nom} : ${el.value==='on'?'attribuée':el.value==='off'?'retirée':'suit les règles'}`);save();toast('Enregistré. Les bulletins calculés de l\'agent sont mis à jour.','ok');render()},
 raAgV:el=>{const a=ag(S.rem.raAg),r=el.dataset.r;if(el.value==='')delPropre(a,r);else setPropre(a,r,Math.max(0,parseFloat(el.value)||0));jp(a.id,'','Montant propre',`${DB.rubriques.find(x=>x.id===r).nom} : ${el.value===''?'grille':el.value}`);save();toast('Montant enregistré.','ok');render()}});
const delPropre=(a,r)=>{const k=LEG[r];if(k)delete a[k];else if(a.paie){delete a.paie[r];if(!Object.keys(a.paie).length)delete a.paie}};
Object.assign(ACT,{
 raAppliquer:()=>{const g=raCible(),rubs={};DB.rubriques.filter(r=>r.actif!==false).forEach(r=>{const v=val('ra_r_'+r.id);if(!v)return;const x={on:v==='on'},m=document.getElementById('ra_v_'+r.id);if(x.on&&m&&m.value!=='')x.v=Math.max(0,parseFloat(m.value)||0);rubs[r.id]=x});
  if(!Object.keys(rubs).length)return toast('Choisissez au moins une rubrique à attribuer ou à retirer.','err');const n=raAgents(g).length;if(!n)return toast('Aucun agent en poste ne correspond à ces critères.','err');
  const R={id:uid(),t:new Date().toISOString(),par:who(),nom:val('ra_nom').trim(),...g,rubs};DB.rubRegles.push(R);jp('','','Règle d\'attribution',`${raDesc(g)} : ${Object.entries(rubs).map(([id,x])=>(x.on?'+':'−')+DB.rubriques.find(r=>r.id===id).nom).join(', ')}`);save();toast(`Règle appliquée à ${n} agent(s). Les bulletins calculés sont mis à jour.`,'ok');render()},
 raDel:d=>{const R=DB.rubRegles.find(g=>g.id===d.id);modal('Supprimer une règle',`<p>Supprimer la règle « <b>${esc(R.nom||raDesc(R))}</b> » ? Les agents concernés reviennent aux règles précédentes. Les bulletins archivés ne changent pas.</p>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn r" data-act="raDelOk" data-id="${R.id}">Supprimer</button>`)},
 raDelOk:d=>{const R=DB.rubRegles.find(g=>g.id===d.id);DB.rubRegles=DB.rubRegles.filter(g=>g.id!==d.id);jp('','','Règle supprimée',R.nom||raDesc(R));save();closeModal();toast('Règle supprimée.','ok');render()}});
