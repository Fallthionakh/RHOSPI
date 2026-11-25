/* ============ Suivi des modifications (toute l'application) et modification des montants depuis le récap ============ */
const SV_MOD={agents:'Agents',affectations:'Mouvements',pointages:'Pointage',absences:'Congés et absences',decisions:'Décisions',demandes:'Demandes',services:'Services',postes:'Catégories',fonctions:'Postes',
 rubriques:'Rubriques de paie',rubRegles:'Règles de paie',formations:'Formation',sante:'Santé au travail',pec:'Prises en charge',documents:'Documents',droits:'Droits d\'accès',vacations:'Vacations',bareme:'Barème des gardes',
 planning:'Planning',bulletins:'Bulletins de paie',paieArretee:'Arrêt de la paie',paramsSvc:'Paramètres des services',vacSvc:'Vacations des services',bilanNotes:'Bilan social',alertesTraitees:'Alertes',
 params:'Paramètres',listes:'Listes',grille:'Grilles de paie',entete:'En-tête des documents',etab:'Établissement',pecCat:'Prises en charge',baremeHors:'Barème des gardes'};
const SV_IGN=new Set(['audit','journalPaie','suivi','corrections','version','seedDate','__forme','rhDemo']),svIgn=k=>SV_IGN.has(k)||/^seq|V\d+$|^paieLeg1$|^rubFonc1$/.test(k);
const SV_CH={prenom:'Prénom',nom:'Nom',mat:'Matricule',tel:'Téléphone',email:'Adresse électronique',sexe:'Sexe',naissance:'Date de naissance',entree:'Date d\'entrée',serviceId:'Service',posteId:'Catégorie',fonctionId:'Poste',
 statut:'Statut',typeContrat:'Type de contrat',univ:'Statut universitaire',matrimoniale:'Situation matrimoniale',enfants:'Enfants',salaireBase:'Salaire de base',situation:'Situation',dateDepart:'Date de départ',
 debut:'Début',fin:'Fin',date:'Date',type:'Type',motif:'Motif',arr:'Arrivée',dep:'Départ',montant:'Montant',actif:'Actif',lignes:'Lignes',etat:'État',paie:'Montants propres',rubOn:'Rubriques de l\'agent',parts:'Parts fiscales',cadre:'Cadre',regimeRetraite:'Régime de retraite',conjointRevenu:'Conjoint avec revenus'};
let SV=null,SV_DB=null;
function svRows(){const m=clRows(DB);for(const k of[...m.keys()]){const c=k.slice(2,k.indexOf(CL_SEP));if(svIgn(c))m.delete(k)}return m}
function svBase(){try{SV=svRows();SV_DB=DB}catch(e){SV=null}}
const svVal=(k,v)=>{if(v==null||v==='')return'—';if(k==='serviceId')return(svc(v)||{}).nom||v;if(k==='posteId')return(poste(v)||{}).nom||v;if(k==='agentId'){const a=ag(v);return a?nomA(a):v}
 if(typeof v==='boolean')return v?'oui':'non';if(typeof v==='object'){const s=JSON.stringify(v);return s.length>70?s.slice(0,67)+'…':s}const s=String(v);return/^\d{4}-\d{2}-\d{2}$/.test(s)?dfr(s):s.length>70?s.slice(0,67)+'…':s};
function svCible(c,id,x){try{x=x||{};if(c==='agents')return`${nomA(x)} (${x.mat||id})`;const a=x.agentId&&ag(x.agentId);
 if(c==='planning'||c==='bulletins'){const[aid,p]=String(id).split('|');const b=ag(aid);return`${b?nomA(b):aid}${p?' — '+(p.length===7?moisLib(p):dfr(p)):''}`}
 if(a)return`${nomA(a)}${x.date?' — '+dfr(x.date):x.debut?' — '+dfr(x.debut):''}`;return x.nom||x.titre||x.objet||x.libelle||(c==='params'||c==='listes'||c==='grille'||c==='entete'?'':String(id))}catch(e){return String(id)}}
function svDiff(a,b,pre=''){if(JSON.stringify(a)===JSON.stringify(b))return[];const plain=o=>o&&typeof o==='object'&&!Array.isArray(o);
 if(!plain(a)||!plain(b)||pre.split('.').length>2)return[[pre||'valeur',a,b]];const out=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)]))out.push(...svDiff(a[k],b[k],pre?pre+'.'+k:k));return out}
function svBul(A,B){const tot=o=>{if(!o||!o.lignes)return null;const g=o.lignes.filter(l=>l.type==='gain').reduce((t,l)=>t+(+l.montant||0),0),r=o.lignes.filter(l=>l.type==='retenue').reduce((t,l)=>t+(+l.montant||0),0);return{g,r,n:g-r}};
 const ta=tot(A),tb=tot(B),m=o=>new Map((o&&o.lignes||[]).map(l=>[l.type+'|'+(l.rubId||l.nom)+'|'+l.nom,+l.montant||0])),ma=m(A),mb=m(B),d=[];
 for(const k of new Set([...ma.keys(),...mb.keys()])){const v1=ma.get(k),v2=mb.get(k);if(v1!==v2)d.push(`${k.split('|')[2]} : ${v1==null?'—':num(v1)} → ${v2==null?'supprimée':num(v2)}`)}
 if(A&&B&&A.statut!==B.statut)d.unshift(`État : ${A.statut} → ${B.statut}`);
 const t=tb?`Brut ${num(tb.g)}, retenues ${num(tb.r)}, net ${num(tb.n)}`:ta?`(avant : brut ${num(ta.g)}, net ${num(ta.n)})`:'';return(A&&B?d.slice(0,10).join(' ; ')+(d.length?' — ':''):'')+t}
function svTrace(){try{if(!SV||SV_DB!==DB)return svBase();const now=svRows(),ch=[];
 for(const[k,j]of now)if(SV.get(k)!==j)ch.push([k,SV.get(k),j]);for(const[k,j]of SV)if(!now.has(k))ch.push([k,j,undefined]);SV=now;if(!ch.length)return;
 DB.suivi=DB.suivi||[];const t=new Date().toISOString(),par=who(),add=e=>DB.suivi.unshift({id:uid(),t,par,...e});
 if(ch.length>150){const n={};ch.forEach(([k])=>{const c=k.slice(2,k.indexOf(CL_SEP));n[c]=(n[c]||0)+1});add({mod:'Plusieurs modules',action:'Modification en masse',cible:`${ch.length} enregistrements`,det:Object.entries(n).map(([c,v])=>`${SV_MOD[c]||c} : ${v}`).join(' ; ')})}
 else ch.forEach(([k,o,n])=>{const ty=k[0],c=k.slice(2,k.indexOf(CL_SEP)),id=k.slice(k.indexOf(CL_SEP)+1),A=o===undefined?undefined:JSON.parse(o),B=n===undefined?undefined:JSON.parse(n),x=B||A;
  const action=A===undefined?'Création':B===undefined?'Suppression':'Modification';let det='';
  if(c==='bulletins'){det=svBul(A,B);add({mod:SV_MOD[c],action:A===undefined?'Bulletin rendu modifiable':B===undefined?'Bulletin rétabli (calcul automatique)':'Modification',cible:svCible(c,id,x),det});return}
  if(action==='Modification'){const d=svDiff(A,B);det=d.slice(0,12).map(([f,v1,v2])=>`${SV_CH[f]||f} : ${svVal(f.split('.').pop(),v1)} → ${svVal(f.split('.').pop(),v2)}`).join(' ; ')+(d.length>12?` ; … (${d.length-12} autre(s))`:'')}
  else if(x&&typeof x==='object'&&!Array.isArray(x))det=Object.entries(x).filter(([f,v])=>v!==''&&v!=null&&!/^(id|pin)$/.test(f)&&typeof v!=='object').slice(0,8).map(([f,v])=>`${SV_CH[f]||f} : ${svVal(f,v)}`).join(' ; ');
  add({mod:SV_MOD[c]||c,action,cible:svCible(c,id,x),det:det.slice(0,700)})});
 if(DB.suivi.length>4000)DB.suivi.length=4000}catch(e){SV=null}}
CL_UNSHIFT.push('suivi');CL_AJOUT.push('suivi');
/* save() est remplacé en mode en ligne : on l'enveloppe au moment où il est appelé */
const SV_SAVE0=save;save=function(){svTrace();return SV_SAVE0.apply(this,arguments)};
init=(f=>function(){const r=f.apply(this,arguments);svBase();return r})(init);

/* ---------- Écran ---------- */
function svEntrees(){const A=[...(DB.suivi||[]).map(x=>({...x,src:'auto'})),...DB.journalPaie.map(j=>({t:j.t,par:j.par,mod:'Paie',action:j.action,cible:[j.agentId?nomA(ag(j.agentId)||{prenom:'',nom:j.agentId}):'',j.ym?moisLib(j.ym):''].filter(Boolean).join(' — '),det:j.detail,src:'op'})),
 ...DB.audit.map(x=>({t:x.t,par:x.par,mod:'Opérations',action:x.action,cible:'',det:x.detail,src:'op'}))];return A.sort((x,y)=>String(y.t).localeCompare(String(x.t)))}
function suiviPage(){const R=S.sv=S.sv||{n:300},all=svEntrees(),q=kNorm(R.q||'');
 const L=all.filter(x=>(!R.du||x.t.slice(0,10)>=R.du)&&(!R.au||x.t.slice(0,10)<=R.au)&&(!R.mod||x.mod===R.mod)&&(!R.par||x.par===R.par)&&(!R.act||x.action===R.act)&&(!q||kNorm(`${x.par} ${x.mod} ${x.action} ${x.cible} ${x.det}`).includes(q)));
 const mods=[...new Set(all.map(x=>x.mod))].sort(),pars=[...new Set(all.map(x=>x.par))].sort(),hh=t=>{const d=new Date(t);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`};
 S.tsv=[['Date','Heure','Auteur','Module','Action','Élément concerné','Détail'],...L.map(x=>[dfr(x.t.slice(0,10)),hh(x.t),x.par,x.mod,x.action,x.cible||'',x.det||''])];S.tsvNom='Suivi_des_modifications';
 const f=(k,l,o)=>`<label class="field" style="min-width:170px">${l}<select data-chg="svF" data-k="${k}"><option value="">Tous</option>${o.map(v=>`<option${v===R[k]?' selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
 return`<div class="card"><div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:10px"><label class="field" style="min-width:220px">Rechercher<input id="sv_q" value="${esc(R.q||'')}" data-chg="svF" data-k="q" placeholder="agent, montant, rubrique…"></label>
 <label class="field">Du<input type="date" data-chg="svF" data-k="du" value="${R.du||''}"></label><label class="field">Au<input type="date" data-chg="svF" data-k="au" value="${R.au||''}"></label>${f('mod','Module',mods)}${f('par','Auteur',pars)}${f('act','Action',['Création','Modification','Suppression'])}
 <button class="btn g s" style="align-self:flex-end;margin-bottom:6px" data-act="svRaz">Effacer les filtres</button></div>
 <div class="grid kpis">${[[L.length,'Modifications trouvées'],[new Set(L.map(x=>x.par)).size,'Auteurs'],[L.length?fdt(L[0].t):'—','La plus récente'],[(DB.suivi||[]).length+DB.journalPaie.length+DB.audit.length,'Entrées conservées']].map(([v,l],i)=>`<div class="kpi" style="cursor:default"><b style="font-size:${i===2?15:22}px">${v}</b><span>${l}</span></div>`).join('')}</div></div>
 <div class="card"><h2>Suivi des modifications</h2>${table(['Date','Heure','Auteur','Module','Action','Élément concerné','Détail'],L.slice(0,R.n).map(x=>`<tr><td>${dfr(x.t.slice(0,10))}</td><td>${hh(x.t)}</td><td>${esc(x.par)}</td><td>${esc(x.mod)}</td><td><span class="pill ${x.action==='Création'?'ok':x.action==='Suppression'?'crit':'info'}">${esc(x.action)}</span></td><td><b>${esc(x.cible||'')}</b></td><td style="white-space:normal;max-width:520px">${esc(x.det||'')}</td></tr>`),'Aucune modification pour ces critères.')}
 ${L.length>R.n?`<div class="row" style="margin-top:10px"><span class="sub">${R.n} sur ${L.length} affichées. L'export Excel contient tout.</span><button class="btn g s" data-act="svPlus">Afficher 300 de plus</button></div>`:''}
 <div class="sub" style="margin-top:8px">Toute modification enregistrée dans l'application (agents, pointage, congés, planning, paie, paramètres…) est inscrite ici avec son auteur, la date et l'heure ; les opérations de paie et d'administration y figurent aussi avec leur motif.</div></div>`}
Object.assign(CHG,{svF:el=>{const R=S.sv=S.sv||{n:300};R[el.dataset.k]=el.value;R.n=300;render();if(el.dataset.k==='q'){const i=document.getElementById('sv_q');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}}});
Object.assign(ACT,{svRaz:()=>{S.sv={n:300};render()},svPlus:()=>{S.sv.n+=300;render()}});

/* ---------- Modifier un montant (gain ou retenue) depuis le journal de paie, le récap ou le bulletin ---------- */
function plRafraichir(a,L){try{const brut=L.filter(x=>x.type==='gain').reduce((t,x)=>t+(+x.montant||0),0),base=L.filter(x=>x.type==='gain'&&x.rubId==='base').reduce((t,x)=>t+(+x.montant||0),0),G=paieLegale(a,brut,base);
 ['ipres','ipm','impot','trimf'].forEach(rid=>{const ls=L.filter(x=>x.type==='retenue'&&x.rubId===rid);if(!ls.length||ls.some(x=>x.manuel))return;const fr=G.ret[rid]||[];if(fr.length===ls.length)ls.forEach((x,i)=>{x.montant=fr[i][1];x.nom=fr[i][0]})})}catch(e){}}
setMontant=function(a,ym,rid,v,ou){const b=bulletin(a,ym);if(b.statut==='archivé')return{ok:false,msg:'Ce bulletin est archivé : la paie de ce mois est arrêtée.'};
 const r=DB.rubriques.find(x=>x.id===rid),type=r?r.type:'gain';let L=b.rec?b.rec.lignes.map(l=>({...l})):b.brut?lignesDe(b).map(({k,...l})=>l):lignesNeuves(a,ym);
 const ls=L.filter(x=>x.type===type&&x.rubId===rid),av=ls.reduce((t,x)=>t+(+x.montant||0),0);if(av===v)return{ok:true};
 if(ls.length){ls[0].montant=v;if(ls.length>1){ls[0].nom=r?r.nom:ls[0].nom;L=L.filter(x=>!ls.slice(1).includes(x))}if(type==='retenue')ls[0].manuel=true}
 else if(type==='gain')L.splice(L.filter(x=>x.type==='gain').length,0,{rubId:rid,nom:r?r.nom:rid,type:'gain',montant:v});else L.push({rubId:rid,nom:r?r.nom:rid,type:'retenue',montant:v,manuel:true});
 const brut=L.filter(x=>x.type==='gain').reduce((t,x)=>t+(+x.montant||0),0);L.forEach(x=>{if(x.type==='retenue'&&x.pct!=null&&!x.manuel)x.montant=Math.round(brut*x.pct/100)});plRafraichir(a,L);
 DB.bulletins[a.id+'|'+ym]={lignes:L,ng:b.ng,statut:'modifié',modifiePar:who(),modifieLe:new Date().toISOString()};
 jp(a.id,ym,'Montant modifié',`${r?r.nom:rid} : ${num(av)} → ${num(v)} — saisi dans ${ou||'le journal de paie'}`);save();return{ok:true}};
bulTot=(f=>function(){const B=S.bul;if(B&&B.agentId)plRafraichir(ag(B.agentId),B.lignes);return f.apply(this,arguments)})(bulTot);
CHG.rrEdit=el=>{const a=ag(el.dataset.id),v=Math.max(0,Math.round(+el.value||0)),r=setMontant(a,el.dataset.ym,el.dataset.r,v,'le récap par rubrique');if(!r.ok)toast(r.msg,'err');else toast(`${nomA(a)} — ${moisLib(el.dataset.ym)} : montant enregistré, bulletin « modifié ».`,'ok');render()};
CHG.rr0=el=>{S.rem.rr0=el.checked;render()};
