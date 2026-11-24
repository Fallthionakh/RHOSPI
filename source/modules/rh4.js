/* ============ Paie simplifiée : commun → catégorie → poste → propre ; arrêt mensuel ; tableau récapitulatif ============ */
const estDef=v=>v!==undefined&&v!==null&&v!=='';
function valGrille(db,a,r){const G=db.grille,f=(G.fonc[a.fonctionId]||{})[r.id],c=(G.cat[a.posteId]||{})[r.id];return estDef(f)?{v:+f,src:'poste'}:estDef(c)?{v:+c,src:'cat'}:{v:+r.montant||0,src:'commun'}}
function sourceRub(a,r){const k=LEG[r.id],o=k?a[k]:(a.paie||{})[r.id];return estDef(o)?{v:+o||0,src:'propre'}:valGrille(DB,a,r)}
valRub=function(a,r){return sourceRub(a,r).v};
const rubBase=()=>DB.rubriques.find(r=>r.id==='base');
const salBase=a=>valRub(a,rubBase());
const SRCL={propre:'propre à l\'agent',poste:'grille du poste',cat:'grille de la catégorie',commun:'commun à tous'};
function srcLib(a,rid){const r=DB.rubriques.find(x=>x.id===rid);if(!r)return'';const s=sourceRub(a,r),l=s.src==='poste'?SRCL.poste+' '+fnom(a):s.src==='cat'?SRCL.cat+' '+poste(a.posteId).nom:SRCL[s.src];return r.id==='garde'?`${num(s.v)} FCFA par garde · ${l}`:l}
const DEMO_IDS=['610900','610913','610926'];
const estDemo=a=>{const n=+a.id,i=(n-610204)/13;return(n>=610204&&Number.isInteger(i)&&i<40)||DEMO_IDS.includes(String(a.id))};

/* ---------- Migration : simplification ---------- */
function simplifierPaie(db){const R=id=>db.rubriques.find(r=>r.id===id),byNom=n=>db.rubriques.find(r=>r.nom.toLowerCase()===n.toLowerCase()),T=dkey(new Date());
 if(!R('motiv')&&!byNom('Prime de motivation'))db.rubriques.push({id:'motiv',nom:'Prime de motivation',type:'gain',mode:'fixe',montant:30000,actif:true});
 if(!R('transp')&&!byNom('Indemnité de transport'))db.rubriques.push({id:'transp',nom:'Indemnité de transport',type:'gain',mode:'fixe',montant:16500,actif:true});
 const lg=R('logement');if(lg)lg.actif=false;
 const ordre=[R('base'),R('motiv')||byNom('Prime de motivation'),R('transp')||byNom('Indemnité de transport'),R('risque'),R('garde')].filter(Boolean);
 db.rubriques=[...ordre,...db.rubriques.filter(r=>r.type==='gain'&&!ordre.includes(r)),...db.rubriques.filter(r=>r.type!=='gain')];
 Object.values(LEG).forEach(k=>db.agents.forEach(a=>{if(a[k]===0||a[k]==='')delete a[k]}));
 const rr=(i,k)=>{const x=Math.sin(i*12.9898+k*78.233)*43758.5453;return x-Math.floor(x)},BASE={A:450000,B:280000,C:180000,D:120000};
 if(db.rhDemo)db.agents.forEach(a=>{const i=(+a.id-610204)/13;if(!estDemo(a)||!Number.isInteger(i))return;const b=BASE[(db.postes.find(x=>x.id===a.posteId)||{}).categorie]||180000;
  if(a.salaireBase===b+Math.floor(rr(i,3)*6)*5000){const g=db.grille.cat[a.posteId]=db.grille.cat[a.posteId]||{};if(!estDef(g.base))g.base=b;delete a.salaireBase}});
 const act=db.agents.filter(a=>a.situation!=='sorti des effectifs'&&!(a.dateDepart&&a.dateDepart<=T));
 Object.entries(LEG).forEach(([rid,k])=>{const r=R(rid);if(!r)return;
  db.postes.forEach(p=>{const g=db.grille.cat[p.id]=db.grille.cat[p.id]||{};if(estDef(g[rid]))return;const vs=act.filter(a=>a.posteId===p.id&&estDef(a[k])).map(a=>+a[k]);if(!vs.length)return;
   const c={};vs.forEach(v=>c[v]=(c[v]||0)+1);g[rid]=+Object.keys(c).sort((x,y)=>c[y]-c[x]||x-y)[0]});
  db.agents.forEach(a=>{if(estDef(a[k])&&+a[k]===valGrille(db,a,r).v)delete a[k]})});
 db.agents.forEach(a=>{if(a.paie)Object.keys(a.paie).forEach(rid=>{const r=R(rid);if(r&&+a.paie[rid]===valGrille(db,a,r).v)delete a.paie[rid]})});
 const CL={MED:'Hors catégorie',INF:'7ème A',SFE:'7ème A',AS:'4ème',TLAB:'7ème A',MRAD:'7ème A',MAJ:'7ème B',SEC:'6ème',ADMN:'8ème A',BRA:'3ème',ENT:'3ème'},VI=['Thiès','Dakar','Tivaouane','Mbour','Saint-Louis','Kaolack','Diourbel','Louga','Rufisque','Ziguinchor'];
 if(db.rhDemo)db.agents.forEach((a,i)=>{if(!estDemo(a))return;if(!a.classement&&CL[a.posteId])a.classement=CL[a.posteId];if(!a.lieuNaissance)a.lieuNaissance=VI[(i*7)%VI.length]})}
const migrateRH3=migrate;
migrate=function(db){migrateRH3(db);const L=db.listes;L.classements=L.classements||['1ère A','1ère B','2ème','3ème','4ème','5ème','6ème','7ème A','7ème B','8ème A','8ème B','9ème','10ème','Hors catégorie'];
 db.paieArretee=db.paieArretee||{};if(!db.paieV2){db.paieV2=1;simplifierPaie(db)}return db};

/* ---------- Éléments propres ---------- */
function setPropre(a,rid,v){const k=LEG[rid],r=DB.rubriques.find(x=>x.id===rid),av=k?a[k]:(a.paie||{})[rid];
 if(v===null){if(k)delete a[k];else if(a.paie)delete a.paie[rid]}else if(k)a[k]=v;else(a.paie=a.paie||{})[rid]=v;
 jp(a.id,'',v===null?'Élément propre retiré':'Élément propre modifié',`${r?r.nom:rid} : ${estDef(av)?num(av):'grille'} → ${v===null?'grille ('+num(valGrille(DB,a,r).v)+')':num(v)}`)}

/* ---------- Arrêt de la paie ---------- */
const ymNow=()=>today().slice(0,7);
const bulletinsMois=ym=>DB.agents.map(a=>({a,b:bulletin(a,ym)})).filter(z=>z.b.brut);
const moisAArreter=ym=>moisAnnee(ym.slice(0,4)).filter(m=>m<=ym&&(!DB.paieArretee[m]||bulletinsMois(m).some(z=>z.b.statut!=='archivé')));
function arreterPaie(mois){let n=0;mois.forEach(m=>{const l=bulletinsMois(m),tb=l.reduce((t,z)=>t+z.b.brut,0),tn=l.reduce((t,z)=>t+z.b.net,0);let k=0;
  l.forEach(({a,b})=>{if(b.statut!=='archivé'){figer(a,m,'archivé');k++}});DB.paieArretee[m]={par:who(),t:new Date().toISOString(),nb:l.length,brut:tb,net:tn};
  jp('',m,'Paie arrêtée',`${l.length} bulletins, dont ${k} archivés à cette occasion — brut ${fcfa(tb)}, net ${fcfa(tn)}`);n+=k});
 audit('Paie arrêtée',mois.map(moisLib).join(', '));save();return n}
function paieModal(ym){const ms=moisAArreter(ym),l=bulletinsMois(ym),tb=l.reduce((t,z)=>t+z.b.brut,0),tn=l.reduce((t,z)=>t+z.b.net,0),na=l.filter(z=>z.b.statut!=='archivé').length,av=ms.filter(m=>m!==ym);
 modal(`Arrêter la paie de ${moisLib(ym)}`,`${ym===ymNow()&&+today().slice(8)>=15?`<p style="margin:0">Nous sommes le ${dfr(today())} : la paie de ${moisLib(ym)} peut être arrêtée.</p>`:''}
 <dl class="fiche">${[['Bulletins du mois',l.length],['À archiver',na],['Masse salariale brute',fcfa(tb)],['Total net à payer',fcfa(tn)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
 ${av.length?`<div class="alert"><div><b>${av.length} mois précédent(s) encore ouvert(s)</b><div>${av.map(moisLib).join(', ')} : leurs bulletins seront archivés en même temps.</div></div></div>`:''}
 <div class="sub">L'arrêt archive les bulletins : ils ne changent plus. Les changements de rubriques, de grilles ou de fiches ne s'appliqueront qu'aux bulletins des mois suivants. Un bulletin peut encore être désarchivé individuellement, avec trace dans le journal de paie.</div>`,
 `<button class="btn g" data-act="close">Plus tard</button><button class="btn g" data-act="paieRecap" data-m="${ym}">Vérifier le tableau récapitulatif</button><button class="btn" data-act="paieArretOk" data-m="${ym}">Arrêter la paie</button>`)}
function popPaie(){const ym=ymNow();if(S.popPaieVu||!S.profil||!can('paieEdit')||+today().slice(8)<15||DB.paieArretee[ym]||$('#layer').innerHTML)return;S.popPaieVu=true;if(bulletinsMois(ym).length)paieModal(ym)}
function arretBtn(ym){const n=bulletinsMois(ym).filter(z=>z.b.statut!=='archivé').length;return n?`<button class="btn" data-act="paieArret" data-m="${ym}">${DB.paieArretee[ym]?`Compléter l'arrêt (${n})`:`Arrêter la paie de ${moisLib(ym)}`}</button>`:''}
function paieBandeau(ym){const A=DB.paieArretee[ym],j=+today().slice(8);
 if(A)return`<div class="demo" style="background:var(--vert-pale);border-color:#b7e2cc;color:#0f5132"><b>Paie de ${moisLib(ym)} arrêtée</b> le ${fdt(A.t)} par ${esc(A.par)} : les bulletins sont archivés et ne changent plus. Les changements de paramétrage s'appliquent aux mois suivants.</div>`;
 if(ym===ymNow())return`<div class="demo" style="background:var(--bleu-pale);border-color:#c5dbf2;color:var(--bleu-fonce)"><b>Paie de ${moisLib(ym)} en cours</b> : les bulletins suivent le paramétrage. ${j<15?`L'arrêt de la paie sera proposé le 15/${ym.slice(5)}/${ym.slice(0,4)}.`:'Elle peut être arrêtée dès maintenant.'}</div>`;
 return`<div class="demo"><b>Paie de ${moisLib(ym)} non arrêtée</b> : ces bulletins changent encore si vous modifiez le paramétrage. Arrêtez-la pour les figer.</div>`}

/* ---------- Tableau récapitulatif ---------- */
const recapLab=r=>({base:'Salaire',motiv:'Motiv',transp:'Transp',risque:'Risque',garde:'Garde'})[r.id]||(/motivation/i.test(r.nom)?'Motiv':/transport/i.test(r.nom)?'Transp':r.nom);
const montantRub=(b,rid)=>b.gains.filter(g=>g[2]===rid).reduce((t,g)=>t+g[1],0);
const autresRub=(b,ids)=>b.gains.filter(g=>!ids.includes(g[2])).reduce((t,g)=>t+g[1],0);
function lignesNeuves(a,ym){const{du,au}=moisBornes(ym),ng=gardesEntre(a,du,au);return DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false).map(r=>r.id==='garde'?{rubId:'garde',nom:`${r.nom} (${ng} garde${ng>1?'s':''})`,type:'gain',montant:ng*valRub(a,r)}:{rubId:r.id,nom:r.nom,type:'gain',montant:valRub(a,r)})}
function setMontant(a,ym,rid,v){const b=bulletin(a,ym);if(b.statut==='archivé')return{ok:false,msg:'Ce bulletin est archivé : la paie de ce mois est arrêtée.'};
 let L=b.rec?b.rec.lignes.map(l=>({...l})):b.brut?lignesDe(b).map(({k,...l})=>l):lignesNeuves(a,ym);const r=DB.rubriques.find(x=>x.id===rid),l=L.find(x=>x.type==='gain'&&x.rubId===rid),av=l?+l.montant||0:0;
 if(av===v)return{ok:true};if(l)l.montant=v;else L.splice(L.filter(x=>x.type==='gain').length,0,{rubId:rid,nom:r?r.nom:rid,type:'gain',montant:v});
 if(!L.some(x=>x.type==='retenue'))DB.rubriques.filter(x=>x.type==='retenue'&&x.actif!==false).forEach(x=>{const p=valRub(a,x);L.push(x.mode==='pct'?{rubId:x.id,nom:`${x.nom} (${String(p).replace('.',',')} %)`,type:'retenue',montant:0,pct:p}:{rubId:x.id,nom:x.nom,type:'retenue',montant:p})});
 const brut=L.filter(x=>x.type==='gain').reduce((t,x)=>t+(+x.montant||0),0);L.forEach(x=>{if(x.type==='retenue'&&x.pct!=null&&!x.manuel)x.montant=Math.round(brut*x.pct/100)});
 DB.bulletins[a.id+'|'+ym]={lignes:L,ng:b.ng,statut:'modifié',modifiePar:who(),modifieLe:new Date().toISOString()};
 jp(a.id,ym,'Montant modifié',`${r?r.nom:rid} : ${num(av)} → ${num(v)} — saisi dans le tableau récapitulatif`);save();return{ok:true}}
function recapDonnees(){const ym=S.rem.ym,{au}=moisBornes(ym),ids=sel();
 const rows=DB.agents.filter(a=>ids.includes(a.serviceId)).map(a=>({a,b:bulletin(a,ym)})).filter(z=>z.b.brut||enPoste(z.a,au)).sort((x,y)=>(x.a.nom+' '+x.a.prenom).localeCompare(y.a.nom+' '+y.a.prenom,'fr'));
 const gs=DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false),cols=gs.filter(r=>['Salaire','Motiv','Transp','Risque','Garde'].includes(recapLab(r))||rows.some(z=>montantRub(z.b,r.id)>0)),cid=cols.map(c=>c.id),autres=rows.some(z=>autresRub(z.b,cid)>0);
 return{ym,rows,cols,cid,autres}}
const recapId=a=>[a.naissance?dfr(a.naissance):'',a.lieuNaissance?'à '+a.lieuNaissance:''].filter(Boolean).join(' ');
const recapFonc=a=>poste(a.posteId).nom+(a.fonctionId&&a.fonctionId!=='F1'?' · '+fnom(a):'');
const RECAPH=['Ordre','Prénom(s) Nom','Date et lieu de naissance','Sexe','Fonction','Situation matrimoniale','Nbre enfts','Catég'];
function recapTSV(D){return[[...RECAPH,...D.cols.map(recapLab),...(D.autres?['Autres']:[]),'Brut'],...D.rows.map(({a,b},i)=>[i+1,a.prenom+' '+a.nom,recapId(a),a.sexe||'',recapFonc(a),a.matrimoniale||'',a.enfants??'',a.classement||'',...D.cols.map(c=>montantRub(b,c.id)),...(D.autres?[autresRub(b,D.cid)]:[]),b.brut])]}
function recapTotaux(){const D=S.recapD;if(!D)return'';const bs=D.rows.map(z=>bulletin(z.a,D.ym)),s=f=>bs.reduce((t,b)=>t+f(b),0);
 return`<td colspan="8" style="text-align:right"><b>Total · ${D.rows.length} agents</b></td>${D.cols.map(c=>`<td><b>${num(s(b=>montantRub(b,c.id)))}</b></td>`).join('')}${D.autres?`<td><b>${num(s(b=>autresRub(b,D.cid)))}</b></td>`:''}<td><b>${num(s(b=>b.brut))}</b></td><td></td>`}
function recapPage(onglets){const D=S.recapD=recapDonnees(),T=today(),e=can('paieEdit');S.tsv=recapTSV(D);S.tsvNom='Etat_recapitulatif_paie_'+D.ym;
 const cell=(a,b,c)=>{const v=montantRub(b,c.id);return e&&b.statut!=='archivé'?`<input type="number" min="0" step="1" value="${v}" data-chg="recap" data-id="${a.id}" data-r="${c.id}" style="width:96px;text-align:right" aria-label="${esc(c.nom)} de ${esc(nomA(a))}">`:num(v)};
 return`<div class="head"><div><h1>Rémunérations</h1><div class="sub">Tableau récapitulatif de ${moisLib(D.ym)} · ${D.rows.length} agent(s) · une cellule modifiée met à jour le bulletin de l'agent</div></div><span class="sp"></span>${svcSelect()}<input type="month" id="rm_m" data-chg="remM" value="${D.ym}" max="${T.slice(0,7)}" aria-label="Mois"><button class="btn v" data-act="remCsv">Exporter Excel</button><button class="btn v" data-act="recapPdf">Imprimer l'état (PDF)</button>${e?arretBtn(D.ym):''}</div>${onglets}${paieBandeau(D.ym)}
 <div class="card"><div class="tw"><table style="font-size:13.5px"><thead><tr>${[...RECAPH,...D.cols.map(recapLab),...(D.autres?['Autres']:[]),'Brut','État'].map(h=>`<th style="white-space:normal">${esc(h)}</th>`).join('')}</tr></thead><tbody>
 ${D.rows.map(({a,b},i)=>`<tr><td>${i+1}</td><td><button class="btn g s" data-act="agent" data-id="${a.id}" style="text-align:left;border:0;padding:2px 4px;font-weight:600">${esc(a.prenom+' '+a.nom)}</button></td><td>${esc(recapId(a)||'—')}</td><td>${esc(a.sexe||'')}</td><td>${esc(recapFonc(a))}</td><td>${esc(a.matrimoniale||'—')}</td><td>${a.enfants??'—'}</td><td>${esc(a.classement||'—')}</td>${D.cols.map(c=>`<td>${cell(a,b,c)}</td>`).join('')}${D.autres?`<td>${num(autresRub(b,D.cid))}</td>`:''}<td><b id="rcb_${a.id}">${num(b.brut)}</b></td><td id="rce_${a.id}">${etatBul(b)}</td></tr>`).join('')}
 <tr id="rc_tot" style="background:var(--bleu-pale)">${recapTotaux()}</tr></tbody></table></div>
 <div class="sub" style="margin-top:8px">${e?'Saisissez un montant puis quittez la cellule : le bulletin de l\'agent passe à l\'état « modifié » et la modification est inscrite au journal de paie. ':''}Les lignes archivées ne sont plus modifiables. Pour un changement durable, utilisez plutôt l'onglet « Rubriques et grilles ». Le brut comprend aussi les lignes ajoutées à la main dans un bulletin.</div></div>`}

/* ---------- Rubriques et grilles ---------- */
function rubPage(e){const dis=e?'':' disabled',u=r=>r.mode==='pct'?'%':'FCFA',gains=DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false),T=today(),G=DB.grille;
 const nb=(k,id)=>DB.agents.filter(a=>enPoste(a,T)&&a[k]===id).length,ph=r=>r.id==='garde'?'par garde':'';
 const colsP=gains.filter(r=>r.id!=='base'||Object.values(G.fonc).some(m=>estDef(m.base)));
 const mat=(par,items,cols,k,inh)=>`<div class="tw"><table><thead><tr><th>${par==='cat'?'Catégorie':'Poste'}</th><th>Agents</th>${cols.map(r=>`<th style="white-space:normal">${esc(r.nom)}${r.id==='garde'?' (par garde)':''}</th>`).join('')}</tr></thead><tbody>${items.map(it=>`<tr><td><b>${esc(it.nom)}</b></td><td>${nb(k,it.id)}</td>${cols.map(r=>{const v=(G[par][it.id]||{})[r.id];return`<td><input type="number" min="0" step="500" style="width:110px" data-chg="grille2" data-par="${par}" data-id="${it.id}" data-r="${r.id}" value="${estDef(v)?v:''}" placeholder="${inh(r)}" aria-label="${esc(r.nom)}, ${esc(it.nom)}"${dis}></td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;
 const props=[];DB.agents.filter(a=>enPoste(a,T)).forEach(a=>DB.rubriques.filter(r=>r.actif!==false).forEach(r=>{const k=LEG[r.id],o=k?a[k]:(a.paie||{})[r.id];if(estDef(o))props.push({a,r,v:+o,g:valGrille(DB,a,r)})}));
 const etape=(n,t,x)=>`<div style="display:flex;gap:10px;align-items:flex-start"><b style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--bleu);color:#fff;display:grid;place-items:center">${n}</b><div><b>${t}</b><div class="sub">${x}</div></div></div>`;
 return`<div class="card" style="border-left:4px solid var(--bleu)"><h2>Comment se calcule chaque ligne du bulletin</h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">${etape(1,'Commun à tous','La valeur de la rubrique s\'applique à tous les agents : transport, motivation, retenues.')}${etape(2,'Par catégorie','Ce qui dépend du métier : salaire de base, prime de risque.')}${etape(3,'Par poste','Les primes liées à la fonction : Major, Chef de service…')}${etape(4,'Propre à l\'agent','Une exception individuelle. Elle passe avant tout le reste.')}</div><div class="sub" style="margin-top:10px">Pour chaque ligne, le niveau le plus précis qui est rempli l'emporte : 4, sinon 3, sinon 2, sinon 1. Une case vide laisse la main au niveau suivant. Les bulletins archivés ne changent plus ; les autres suivent immédiatement ces réglages.</div></div>
 <div class="card"><h2>1 · Rubriques et montants communs à tous</h2>${table(['Rubrique','Type','Calcul','Commun à tous','Active','Actions'],DB.rubriques.map(r=>`<tr><td><input data-chg="rub" data-id="${r.id}" data-k="nom" value="${esc(r.nom)}" aria-label="Nom de la rubrique"${dis}></td><td><span class="pill ${r.type==='gain'?'ok':'crit'}">${r.type==='gain'?'gain':'retenue'}</span></td><td>${r.id==='garde'?'par garde effectuée':r.mode==='pct'?'% du brut':'montant fixe'}</td><td><div class="row" style="flex-wrap:nowrap"><input type="number" min="0" step="${r.mode==='pct'?.1:500}" style="width:120px" data-chg="rub" data-id="${r.id}" data-k="montant" value="${r.montant}" aria-label="Montant commun"${dis}> ${u(r)}</div></td><td><input type="checkbox" data-chg="rubActif" data-id="${r.id}"${r.actif!==false?' checked':''}${r.id==='base'||!e?' disabled':''} aria-label="Rubrique active"></td><td>${e&&!['base','garde'].includes(r.id)?`<button class="btn r s" data-act="rubDel" data-id="${r.id}">Supprimer</button>`:'—'}</td></tr>`))}
 ${e?`<h3 style="margin:14px 0 8px">Ajouter une rubrique</h3><div class="form"><label class="field">Nom<input id="rb_nom" placeholder="ex. Indemnité de sujétion"></label><label class="field">Type<select id="rb_type"><option value="gain">Gain (prime, indemnité)</option><option value="retenue">Retenue</option></select></label><label class="field">Calcul<select id="rb_mode"><option value="fixe">Montant fixe</option><option value="pct">% du brut (retenue)</option></select></label><label class="field">Montant commun<input type="number" min="0" id="rb_mt" value="0"></label><div class="field"><span>&nbsp;</span><button class="btn" data-act="rubAdd">Ajouter la rubrique</button></div></div>`:''}</div>
 <div class="card"><h2>2 · Grille par catégorie socio-professionnelle</h2><div class="sub" style="margin-bottom:8px">Une ligne par catégorie. Case vide : le montant commun (indiqué en gris) s'applique.</div>${mat('cat',DB.postes,gains,'posteId',r=>(r.id==='garde'?'par garde : ':'commun : ')+num(r.montant))}</div>
 <div class="card"><h2>3 · Primes par poste</h2><div class="sub" style="margin-bottom:8px">Pour les primes liées à la fonction. Case vide : le montant de la catégorie de l'agent s'applique.</div>${mat('fonc',DB.fonctions,colsP,'fonctionId',()=>'selon la catégorie')}</div>
 <div class="card"><h2>4 · Éléments propres aux agents</h2><div class="sub" style="margin-bottom:8px">Uniquement les exceptions. ${props.length} élément(s) propre(s) en vigueur.</div>${table(['Agent','Catégorie · poste','Rubrique','Montant propre','Sans exception (grille)',''],props.map(({a,r,v,g})=>`<tr><td><b>${esc(nomA(a))}</b><br><span class="sub">${a.mat}</span></td><td>${esc(poste(a.posteId).nom)}<br><span class="sub">${esc(fnom(a))}</span></td><td>${esc(r.nom)}</td><td><input type="number" min="0" step="500" style="width:110px" data-chg="propre" data-id="${a.id}" data-r="${r.id}" value="${v}" aria-label="Montant propre"${dis}></td><td>${num(g.v)} <span class="sub">(${SRCL[g.src]})</span></td><td>${e?`<button class="btn g s" data-act="propreDel" data-id="${a.id}" data-r="${r.id}">Revenir à la grille</button>`:''}</td></tr>`),'Aucune exception : tous les agents suivent les grilles.')}
 ${e?`<h3 style="margin:14px 0 8px">Ajouter un élément propre</h3><div class="form"><label class="field">Agent${agPick('pr_ag',DB.agents.filter(a=>enPoste(a,T)),'')}</label><label class="field">Rubrique<select id="pr_r">${opt(DB.rubriques.filter(r=>r.actif!==false&&!(r.type==='retenue'&&r.mode==='pct')),'',r=>[r.id,r.nom+(r.id==='garde'?' (par garde)':'')])}</select></label><label class="field">Montant propre (FCFA)<input type="number" min="0" step="500" id="pr_v" value="0"></label><div class="field"><span>&nbsp;</span><button class="btn" data-act="propreAdd">Ajouter</button></div></div>`:''}</div>`}

/* ---------- Fiche agent : rémunération et origine des montants ---------- */
function remSources(a){return DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false).map(r=>{const s=sourceRub(a,r);return s.v||r.id==='base'?[r.nom+(r.id==='garde'?' (par garde)':''),`${fcfa(s.v)} · ${s.src==='poste'?'poste':s.src==='cat'?'catégorie':SRCL[s.src]}`]:null}).filter(Boolean)}

/* ---------- Actions ---------- */
const renderSansPop=render;
render=function(){renderSansPop();setTimeout(popPaie,0)};
Object.assign(CHG,{
 recap:el=>{const a=ag(el.dataset.id),ym=S.rem.ym,v=Math.max(0,Math.round(+el.value||0)),r=setMontant(a,ym,el.dataset.r,v);if(!r.ok){toast(r.msg,'err');return render()}
  const b=bulletin(a,ym),x=document.getElementById('rcb_'+a.id),z=document.getElementById('rce_'+a.id),t=document.getElementById('rc_tot');if(x)x.textContent=num(b.brut);if(z)z.innerHTML=etatBul(b);if(t)t.innerHTML=recapTotaux()},
 grille2:el=>{const{par,id,r}=el.dataset,m=DB.grille[par][id]=DB.grille[par][id]||{},rb=DB.rubriques.find(x=>x.id===r),av=m[r],nom=((par==='cat'?poste(id):fonc(id))||{}).nom;
  if(el.value==='')delete m[r];else m[r]=Math.max(0,parseFloat(el.value)||0);
  jp('','','Grille modifiée',`${par==='cat'?'Catégorie':'Poste'} ${nom} — ${rb.nom} : ${estDef(av)?num(av):'vide'} → ${estDef(m[r])?num(m[r]):'vide'}`);save();toast(`${rb.nom} enregistré pour ${nom}. Les bulletins non archivés sont mis à jour.`,'ok')},
 propre:el=>{const a=ag(el.dataset.id);setPropre(a,el.dataset.r,Math.max(0,parseFloat(el.value)||0));save();toast('Élément propre enregistré.','ok')}
});
Object.assign(ACT,{
 paieArret:d=>paieModal(d.m),
 paieArretOk:d=>{const ms=moisAArreter(d.m),n=arreterPaie(ms.length?ms:[d.m]);closeModal();toast(`Paie arrêtée : ${n} bulletin(s) archivé(s). Les prochains changements ne concerneront que les mois suivants.`,'ok');render()},
 paieRecap:d=>{closeModal();S.page='remun';S.rem.tab='recap';S.rem.agentId='';S.rem.ym=d.m||ymNow();render()},
 recapPdf:()=>{const D=S.recapD,t=S.tsv,n=t[0].length,fix=[9,34,32,9,30,19,10,14],rest=(265-fix.reduce((x,y)=>x+y,0))/(n-8),tot=['','TOTAL','','','','','','',...t[0].slice(8).map((_,j)=>num(t.slice(1).reduce((s,r)=>s+(+r[8+j]||0),0)))];
  sortirPDF(l=>pdfOfficiel(l,{paysage:true,date:today(),titre:'ÉTAT RÉCAPITULATIF DE LA PAIE',sousTitre:`${moisLib(D.ym)} - ${DB.etab}`,table:{heads:t[0],widths:[...fix,...Array(n-8).fill(rest)],size:7.5,rows:[...t.slice(1).map(r=>r.map((c,j)=>j>=8?num(c):c)),tot]}}),S.tsvNom+'.pdf')},
 propreDel:d=>{setPropre(ag(d.id),d.r,null);save();toast('L\'agent suit de nouveau la grille pour cette rubrique.','ok');render()},
 propreAdd:()=>{const a=ag(pickId('pr_ag')),rid=val('pr_r');if(!a)return toast('Agent non trouvé. Précisez la recherche ou choisissez-le dans la liste.','err');if(!rid)return toast('Choisissez la rubrique.','err');
  setPropre(a,rid,Math.max(0,parseFloat(val('pr_v'))||0));save();toast(`Élément propre ajouté pour ${nomA(a)}.`,'ok');render()}
});
