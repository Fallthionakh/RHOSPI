/* ============ Listes de présence : par agent et par service ============ */
const migratePres=migrate;migrate=function(db){migratePres(db);if(db.params.hsSeuil===undefined)db.params.hsSeuil=15;return db};
const dhm=iso=>{if(!iso)return'';const d=new Date(iso);return`${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const sdur=m=>m==null?'—':m===0?'0 h 00':(m>0?'+':'−')+dur(Math.abs(m));
function presenceLignes(ids,du,au){const out=[],seuil=+DB.params.hsSeuil||0;
 ids.forEach(id=>{for(let d=du;d<=au;d=addDays(d,1)){const r=etat(id,d);if(!(r.prog>0||(r.p&&(r.p.arr||r.p.absent))||r.abs))continue;if(r.statut==='attendu')continue;
  const p=r.p||{},complet=!!(p.arr&&p.dep),ecart=complet?Math.round(r.presence-r.prog):null,hs=ecart!=null&&ecart>=seuil&&seuil>=0?ecart:0;
  out.push({a:ag(id),d,r,p,ecart,hs,presence:complet?Math.round(r.presence):0})}});return out}
const LPH=['Date','Vacation','Arrivée prévue','Arrivée réelle','Départ prévu','Départ réel','Durée de présence','Écart','Retard','Heures sup.','Statut'];
function presenceTSV(L,avecAgent){return[[...(avecAgent?['Agent','Matricule','Service']:[]),...LPH],...L.map(z=>[...(avecAgent?[nomA(z.a),z.a.mat,svc(z.a.serviceId).nom]:[]),dfr(z.d),z.r.vac?z.r.vac.nom:(z.r.abs?z.r.abs.type:''),z.r.s?dhm(z.r.s.toISOString()):'',dhm(z.p.arr),z.r.e?dhm(z.r.e.toISOString()):'',dhm(z.p.dep),z.presence?dur(z.presence):'',z.ecart==null?'':sdur(z.ecart),z.r.retard?z.r.retard+' min':'',z.hs?dur(z.hs):'',LIB[z.r.statut][0]])]}
function presenceTotaux(L){const s=f=>L.reduce((t,z)=>t+(f(z)||0),0);return{jours:L.filter(z=>z.r.prog>0&&!z.r.abs).length,presents:L.filter(z=>z.p.arr).length,retards:L.filter(z=>z.r.retard>0).length,minRetard:s(z=>z.r.retard),presence:s(z=>z.presence),ecart:s(z=>z.ecart),hs:s(z=>z.hs),incomplets:L.filter(z=>z.r.statut==='incomplet').length}}
function presenceTable(L,avecAgent){const T=presenceTotaux(L),c=k=>k==null?'':k;
 return`<div class="grid kpis" style="margin-bottom:12px">${[[T.jours,'Vacations programmées'],[T.presents,'Présences pointées'],[`${T.retards} · ${T.minRetard} min`,'Retards'],[dur(T.presence),'Heures de présence'],[sdur(T.ecart),'Écart total'],[dur(T.hs),'Heures supplémentaires']].map(([n,l],i)=>`<div class="kpi ${i===2&&T.retards?'warn':i===5&&T.hs?'ok':''}" style="cursor:default"><b style="font-size:20px">${n}</b><span>${l}</span></div>`).join('')}</div>
 ${table([...(avecAgent?['Agent']:[]),...LPH],L.map(z=>`<tr>${avecAgent?`<td><button class="btn g s" data-act="agent" data-id="${z.a.id}" style="border:0;padding:2px 4px;font-weight:600;text-align:left">${esc(nomA(z.a))}</button><br><span class="sub">${z.a.mat} · ${esc(svc(z.a.serviceId).code)}</span></td>`:''}<td>${fdate(z.d)}</td><td>${z.r.vac?`<span class="vc v${vk(z.r.vac.code)}">${esc(z.r.vac.code)}</span> ${esc(z.r.vac.nom)}`:esc(z.r.abs?z.r.abs.type:'—')}</td><td>${z.r.s?dhm(z.r.s.toISOString()):'—'}</td><td><b>${dhm(z.p.arr)||'—'}</b>${z.p.arrMode==='manuel'?'<span class="tag">manuel</span>':''}</td><td>${z.r.e?dhm(z.r.e.toISOString()):'—'}</td><td><b>${dhm(z.p.dep)||'—'}</b>${z.p.depMode==='manuel'?'<span class="tag">manuel</span>':''}</td><td>${z.presence?dur(z.presence):'—'}</td><td style="color:${z.ecart<0?'var(--crit)':z.ecart>0?'var(--ok)':'inherit'}">${sdur(z.ecart)}</td><td>${z.r.retard?`<span class="pill warn">${z.r.retard} min</span>`:'—'}</td><td>${z.hs?`<span class="pill ok">${dur(z.hs)}</span>`:'—'}</td><td>${pill(z.r.statut)}</td></tr>`),'Aucune vacation sur la période.')}
 <div class="sub" style="margin-top:8px">Écart = durée de présence − durée programmée (pauses déduites). Heures supplémentaires = écart positif d'au moins ${DB.params.hsSeuil} min (seuil réglable dans le Paramétrage). Retard compté après la tolérance du service.</div>`}
function presencePDF(L,titre,sous,avecAgent,lib){const t=presenceTSV(L,avecAgent),T=presenceTotaux(L);return pdfOfficiel(lib,{simple:true,paysage:true,date:today(),titre,sousTitre:sous,paras:[`Vacations programmées : ${T.jours} - Présences pointées : ${T.presents} - Retards : ${T.retards} (${T.minRetard} min) - Heures de présence : ${dur(T.presence)} - Écart total : ${sdur(T.ecart)} - Heures supplémentaires : ${dur(T.hs)}`],table:{heads:t[0],size:7,rows:t.slice(1)}})}

/* Fiche de l'agent */
const agentAvantLP=PAGES.agent;
PAGES.agent=()=>{const h=agentAvantLP(),a=ag(S.agentId);if(!a||!scope().includes(a.serviceId))return h;const T=today(),P=S.lp=S.lp&&S.lp.id===a.id?S.lp:{id:a.id,du:addDays(T,-29),au:T},L=presenceLignes([a.id],P.du,P.au);
 const carte=`<div class="card"><div class="head" style="margin-bottom:12px"><h2>Liste de présence</h2><span class="sp"></span><label class="row" style="gap:6px">Du<input type="date" data-chg="lpDate" data-k="du" value="${P.du}" max="${P.au}"></label><label class="row" style="gap:6px">au<input type="date" data-chg="lpDate" data-k="au" value="${P.au}" min="${P.du}" max="${T}"></label><button class="btn v s" data-act="lpCsv" data-id="${a.id}">Exporter Excel</button><button class="btn g s" data-act="lpPdf" data-id="${a.id}">Imprimer (PDF)</button></div>${presenceTable(L.slice().reverse(),false)}</div>`;
 const k='<div class="card"><h2>Historique des affectations et des postes</h2>',i=h.indexOf(k);return i<0?h+carte:h.slice(0,i)+carte+h.slice(i)};

/* Rapports : liste de présence par service */
const rapportsAvantLP=PAGES.rapports;
PAGES.rapports=()=>{const R=S.rap,h=rapportsAvantLP(),i=h.indexOf('<div class="card">'),head=i<0?h:h.slice(0,i),vue=R.agentId?'agent':(R.vue||'synthese');
 const bascule=R.agentId?'':`<div class="row">${[['synthese','Synthèse par service'],['presence','Liste de présence']].map(([k,l])=>`<button class="btn ${vue===k?'':'g'}" data-act="rapVue" data-v="${k}">${l}</button>`).join('')}</div>`;
 if(vue!=='presence')return head+bascule+(i<0?'':h.slice(i));
 const ids=sel(),as=DB.agents.filter(a=>ids.includes(a.serviceId)).sort((x,y)=>(svc(x.serviceId).nom+x.nom).localeCompare(svc(y.serviceId).nom+y.nom,'fr')),L=presenceLignes(as.map(a=>a.id),R.du,R.au).sort((x,y)=>x.d<y.d?1:x.d>y.d?-1:(svc(x.a.serviceId).nom+x.a.nom).localeCompare(svc(y.a.serviceId).nom+y.a.nom,'fr'));
 S.tsv=presenceTSV(L,true);S.lpL=L;const nomS=ids.length===1?svc(ids[0]).nom:ids.length===DB.services.length?'tous les services':ids.length+' services';
 return head+bascule+`<div class="card"><div class="head" style="margin-bottom:12px"><h2>Liste de présence — ${esc(nomS)}</h2><span class="sp"></span><button class="btn v s" data-act="lpCsvSvc">Exporter Excel</button><button class="btn g s" data-act="lpPdfSvc">Imprimer (PDF)</button></div>${presenceTable(L,true)}</div>`};
Object.assign(CHG,{lpDate:el=>{if(!el.value)return;const P=S.lp;P[el.dataset.k]=el.value;if(P.du>P.au){if(el.dataset.k==='du')P.au=P.du;else P.du=P.au}render()}});
Object.assign(ACT,{
 rapVue:d=>{S.rap.vue=d.v;render()},
 lpCsv:d=>{const a=ag(d.id),P=S.lp;exportCSV(`Presence_${a.mat}_${P.du}_${P.au}`,presenceTSV(presenceLignes([a.id],P.du,P.au),false))},
 lpPdf:d=>{const a=ag(d.id),P=S.lp;sortirPDF(l=>presencePDF(presenceLignes([a.id],P.du,P.au),'LISTE DE PRÉSENCE',`${nomA(a)} - matricule ${a.mat} - ${svc(a.serviceId).nom} - du ${dfr(P.du)} au ${dfr(P.au)}`,false,l),`Presence_${a.mat}.pdf`)},
 lpCsvSvc:()=>exportCSV(`Presence_${S.rap.du}_${S.rap.au}`,S.tsv),
 lpPdfSvc:()=>{const ids=sel(),R=S.rap;sortirPDF(l=>presencePDF(S.lpL,'LISTE DE PRÉSENCE',`${ids.length===1?svc(ids[0]).nom:'Services : '+ids.map(i=>svc(i).code).join(', ')} - du ${dfr(R.du)} au ${dfr(R.au)}`,true,l),`Presence_service_${R.du}_${R.au}.pdf`)}
});
