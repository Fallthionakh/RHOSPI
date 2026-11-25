/* ============ Déclarations (impôt, IPRES, FNR, CSS, IPM, CFCE) et récapitulatif par rubrique ============ */
const mtRub=(b,rid)=>[...b.gains,...b.ret].filter(g=>g[2]===rid).reduce((t,g)=>t+g[1],0);
const dcMois=(p1,p2)=>{const o=[];let [y,m]=p1.split('-').map(Number);const[y2,m2]=p2.split('-').map(Number);while((y<y2||y===y2&&m<=m2)&&o.length<36){o.push(`${y}-${String(m).padStart(2,'0')}`);if(++m>12){m=1;y++}}return o};
const dcPer=(p1,p2)=>p1===p2?moisLib(p1):`${moisLib(p1)} à ${moisLib(p2)}`;
function dcData(a,ym,C){const k=a.id+'|'+ym;if(C.has(k))return C.get(k);const b=bulletin(a,ym);let x=null;
 if(b.brut){const base=montantRub(b,'base'),L=b.legal||paieLegale(a,b.brut,base),lr=id=>b.ret.filter(g=>g[2]===id);
  x={a,ym,b,L,brut:b.brut,base,reg:L.reg,ret:id=>mtRub(b,id),rl:(id,re)=>lr(id).filter(g=>re.test(g[0])).reduce((t,g)=>t+g[1],0),pat:re=>L.pat.filter(g=>re.test(g[0])).reduce((t,g)=>t+g[1],0),P:DB.params.paieLeg}}
 C.set(k,x);return x}
/* Chaque organisme : colonnes [libellé, valeur(x), additionnable] et filtre des agents concernés */
const DC_ORG={
 ir:{nom:'Impôt sur le revenu et TRIMF',dest:'DGID — Direction générale des impôts et des domaines (retenues à la source)',
  ok:x=>x.ret('impot')+x.ret('trimf')>0,
  cols:[['Brut imposable',x=>x.brut],['Parts fiscales',x=>x.L.parts,false],['Impôt sur le revenu',x=>x.ret('impot')],['TRIMF',x=>x.ret('trimf')],['Total à reverser',x=>x.ret('impot')+x.ret('trimf')]]},
 ipres:{nom:'IPRES — retraite des non-fonctionnaires',dest:'Institution de prévoyance retraite du Sénégal',
  ok:x=>x.reg==='IPRES'&&x.ret('ipres')>0,
  cols:[['Salaire brut',x=>x.brut],['Assiette régime général',x=>Math.min(x.brut,x.P.ipresPlaf)],['Assiette cadres',x=>x.rl('ipres',/cadres/i)?Math.max(0,Math.min(x.brut,x.P.ipresRCCPlaf)-x.P.ipresPlaf):0],
   ['Part salariale régime général',x=>x.rl('ipres',/^(?!.*cadres)/i)],['Part salariale cadres',x=>x.rl('ipres',/cadres/i)],['Part patronale régime général',x=>x.pat(/^IPRES régime général/)],['Part patronale cadres',x=>x.rl('ipres',/cadres/i)?x.pat(/^IPRES cadres/):0],
   ['Total à reverser',x=>x.ret('ipres')+x.pat(/^IPRES régime général/)+(x.rl('ipres',/cadres/i)?x.pat(/^IPRES cadres/):0)]]},
 fnr:{nom:'FNR — retraite des fonctionnaires',dest:'Fonds national de retraite',
  ok:x=>x.reg==='FNR'&&x.ret('ipres')>0,
  cols:[['Salaire de base',x=>x.base],['Retenue pour pension',x=>x.rl('ipres',/pension/i)],['Complémentaire, part du fonctionnaire',x=>x.rl('ipres',/complémentaire/i)],['Complémentaire, part de l\'administration',x=>x.pat(/^FNR/)],['Total à reverser',x=>x.ret('ipres')+x.pat(/^FNR/)]]},
 css:{nom:'CSS — prestations familiales et accidents du travail',dest:'Caisse de sécurité sociale (cotisations à la charge de l\'employeur)',
  ok:x=>x.reg==='IPRES'&&x.b.baseOn!==false&&x.base>0,
  cols:[['Salaire brut',x=>x.brut],['Assiette plafonnée',x=>Math.min(x.brut,x.P.cssPlaf)],['Prestations familiales',x=>x.pat(/^CSS prestations/)],['Accidents du travail',x=>x.pat(/^CSS accidents/)],['Total à reverser',x=>x.pat(/^CSS/)]]},
 ipm:{nom:'IPM — prévoyance maladie',dest:'Institution de prévoyance maladie de l\'établissement',
  ok:x=>x.ret('ipm')>0,
  cols:[['Salaire brut',x=>x.brut],['Assiette plafonnée',x=>Math.min(x.brut,x.P.ipmPlaf)],['Part salariale',x=>x.ret('ipm')],['Part patronale',x=>x.pat(/^IPM/)],['Total à reverser',x=>x.ret('ipm')+x.pat(/^IPM/)]]},
 cfce:{nom:'CFCE — contribution forfaitaire à la charge de l\'employeur',dest:'DGID',
  ok:x=>x.pat(/^CFCE/)>0&&x.reg==='IPRES'&&x.b.baseOn!==false,
  cols:[['Salaire brut',x=>x.brut],['CFCE',x=>x.pat(/^CFCE/)]]}};
/* Agrégation : une ligne par agent (ou par agent et par mois) */
function dcLignes(ok,cols,mois,detail,svcF){const C=new Map(),as=DB.agents.filter(a=>scope().includes(a.serviceId)&&(!svcF||a.serviceId===svcF)).sort((x,y)=>String(x.mat).localeCompare(String(y.mat))),out=[];
 as.forEach(a=>{const xs=mois.map(ym=>dcData(a,ym,C)).filter(x=>x&&ok(x));if(!xs.length)return;
  const grp=detail?xs.map(x=>[x]):[xs];grp.forEach(g=>{const p1=g[0].ym,p2=g[g.length-1].ym;out.push({a,per:dcPer(p1,p2)+(detail||g.length===mois.length?'':` (${g.length} mois)`),v:cols.map(([,f,add])=>add===false?f(g[g.length-1]):g.reduce((t,x)=>t+(f(x)||0),0))})})});return out}
function dcTable(cols,L,vide){const tot=cols.map(([,,add],i)=>add===false?'':L.reduce((t,l)=>t+l.v[i],0));
 return table(['Matricule','Prénom et nom','Service','Période',...cols.map(c=>c[0])],[...L.map(l=>`<tr><td>${esc(l.a.mat)}</td><td><b>${esc(nomA(l.a))}</b></td><td>${esc(svc(l.a.serviceId).nom)}</td><td>${esc(l.per)}</td>${l.v.map((v,i)=>`<td style="text-align:right">${cols[i][2]===false?plFr(v):num(v)}</td>`).join('')}</tr>`),
  ...(L.length?[`<tr style="background:var(--bleu-pale)"><td></td><td><b>TOTAL</b></td><td>${L.length} ligne(s)</td><td></td>${tot.map(v=>`<td style="text-align:right"><b>${v===''?'':num(v)}</b></td>`).join('')}</tr>`]:[])],vide)}
function dcFiltres(R,extra){const T=today().slice(0,7);
 return`<div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px">${extra}<label class="field" style="min-width:150px">Du mois<input type="month" data-chg="dcP" data-k="p1" value="${R.p1}" max="${T}"></label><label class="field" style="min-width:150px">Au mois<input type="month" data-chg="dcP" data-k="p2" value="${R.p2}" max="${T}"></label>
 <div class="field"><span>Raccourcis</span><div class="row" style="gap:4px">${[['m','Mois'],['t','Trimestre'],['a','Année']].map(([k,l])=>`<button class="btn g s" data-act="dcRac" data-k="${k}">${l}</button>`).join('')}</div></div>
 <label class="field" style="min-width:180px">Service<select data-chg="dcP" data-k="svc"><option value="">Tous les services</option>${opt(DB.services.filter(s=>scope().includes(s.id)),R.svc||'',s=>[s.id,s.nom])}</select></label>
 <label class="row" style="gap:6px;align-self:flex-end;padding-bottom:10px"><input type="checkbox" data-chg="dcP" data-k="detail"${R.detail?' checked':''}> Une ligne par mois</label></div>`}
const dcInit=()=>{const R=S.rem,T=today().slice(0,7);R.p2=R.p2||R.ym||T;R.p1=R.p1||R.p2;if(R.p1>R.p2)R.p1=R.p2;return R};
function declPage(onglets){const R=dcInit(),org=DC_ORG[R.org]?R.org:'ir',O=DC_ORG[org],mois=dcMois(R.p1,R.p2),L=dcLignes(O.ok,O.cols,mois,R.detail,R.svc),per=dcPer(R.p1,R.p2),it=O.cols.length-1;
 const tot=L.reduce((t,l)=>t+l.v[it],0),T=O.cols.findIndex(c=>/salariale|Impôt|Retenue/.test(c[0]));
 S.tsv=[['Matricule','Prénom et nom','Service','Période',...O.cols.map(c=>c[0])],...L.map(l=>[l.a.mat,nomA(l.a),svc(l.a.serviceId).nom,l.per,...l.v])];S.tsvNom=`Declaration_${org}_${R.p1}${R.p2!==R.p1?'_'+R.p2:''}`;
 return`<div class="head"><div><h1>Rémunérations</h1><div class="sub">Déclarations des retenues à la source et des cotisations, par organisme</div></div><span class="sp"></span><button class="btn v" data-act="dcPdf">Déclaration PDF</button><button class="btn v" data-act="dcXls">Exporter Excel</button></div>${onglets}
 <div class="card">${dcFiltres(R,`<label class="field" style="min-width:300px">Déclaration<select data-chg="dcP" data-k="org">${Object.entries(DC_ORG).map(([k,o])=>`<option value="${k}"${k===org?' selected':''}>${esc(o.nom)}</option>`).join('')}</select></label>`)}
 <div class="grid kpis">${[[L.length?new Set(L.map(l=>l.a.id)).size:0,'Agents déclarés'],[per,'Période'],[fcfa(tot),'Total à reverser'],[esc(O.dest),'Organisme']].map(([v,l],i)=>`<div class="kpi" style="cursor:default"><b style="font-size:${i===3?13:i===1?16:22}px">${v}</b><span>${l}</span></div>`).join('')}</div></div>
 <div class="card"><h2>Déclaration ${esc(O.nom)} — ${esc(per)}</h2>${dcTable(O.cols,L,'Aucun agent concerné sur cette période.')}
 <div class="sub" style="margin-top:8px">Montants tirés des bulletins (archivés ou calculés) de la période. Les parts patronales des bulletins archivés sont recalculées avec les taux actuels.</div></div>`}
/* ---------- Récapitulatif par rubrique ---------- */
const RR_PAT=[['pat:ipres','IPRES — part patronale',/^IPRES/],['pat:fnr','FNR — part de l\'administration',/^FNR/],['pat:csspf','CSS — prestations familiales',/^CSS prestations/],['pat:cssat','CSS — accidents du travail',/^CSS accidents/],['pat:ipm','IPM — part patronale',/^IPM/],['pat:cfce','CFCE',/^CFCE/]];
function rrDef(id){if(id==='tot:brut')return{nom:'Salaire brut',f:x=>x.brut};if(id==='tot:ret')return{nom:'Total des retenues',f:x=>x.b.retenues};if(id==='tot:net')return{nom:'Net à payer',f:x=>x.b.net};if(id==='tot:pat')return{nom:'Total des charges patronales',f:x=>x.L.tp};
 const p=RR_PAT.find(z=>z[0]===id);if(p)return{nom:p[1],f:x=>id==='pat:ipres'&&!x.ret('ipres')||id==='pat:ipm'&&!x.ret('ipm')||/^pat:css|pat:cfce/.test(id)&&!(x.reg==='IPRES'&&x.b.baseOn!==false&&x.base>0)?0:x.pat(p[2])};
 const r=DB.rubriques.find(z=>z.id===id)||DB.rubriques[0];return{nom:r.nom,type:r.type,f:x=>x.ret(r.id)}}
function rrubPage(onglets){const R=dcInit(),id=R.rr||'base',D=rrDef(id),mois=dcMois(R.p1,R.p2),L=dcLignes(x=>D.f(x)>0,[['Montant',D.f]],mois,R.detail,R.svc),per=dcPer(R.p1,R.p2),tot=L.reduce((t,l)=>t+l.v[0],0),na=new Set(L.map(l=>l.a.id)).size;
 const o=(v,l)=>`<option value="${v}"${v===id?' selected':''}>${esc(l)}</option>`,rubs=DB.rubriques.filter(r=>r.actif!==false||r.id===id);
 const sel=`<label class="field" style="min-width:300px">Rubrique<select data-chg="dcP" data-k="rr"><optgroup label="Gains">${rubs.filter(r=>r.type==='gain').map(r=>o(r.id,r.nom)).join('')}</optgroup><optgroup label="Retenues à la source">${rubs.filter(r=>r.type==='retenue').map(r=>o(r.id,r.nom)).join('')}</optgroup><optgroup label="Charges patronales">${RR_PAT.map(p=>o(p[0],p[1])).join('')}${o('tot:pat','Total des charges patronales')}</optgroup><optgroup label="Totaux">${o('tot:brut','Salaire brut')}${o('tot:ret','Total des retenues')}${o('tot:net','Net à payer')}</optgroup></select></label>`;
 S.tsv=[['Matricule','Prénom et nom','Service','Catégorie','Type de contrat','Période',D.nom],...L.map(l=>[l.a.mat,nomA(l.a),svc(l.a.serviceId).nom,(poste(l.a.posteId)||{}).nom||'',l.a.typeContrat||'',l.per,l.v[0]])];S.tsvNom=`Recap_${D.nom.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_')}_${R.p1}${R.p2!==R.p1?'_'+R.p2:''}`;
 return`<div class="head"><div><h1>Rémunérations</h1><div class="sub">Récapitulatif d'une rubrique : agents, matricules, période et montants</div></div><span class="sp"></span><button class="btn v" data-act="dcPdf" data-r="1">Récapitulatif PDF</button><button class="btn v" data-act="dcXls">Exporter Excel</button></div>${onglets}
 <div class="card">${dcFiltres(R,sel)}<div class="grid kpis">${[[na,'Agents concernés'],[per,'Période'],[fcfa(tot),'Total '+D.nom.toLowerCase()],[na?fcfa(tot/na):'—','Moyenne par agent']].map(([v,l],i)=>`<div class="kpi" style="cursor:default"><b style="font-size:${i===1?16:22}px">${v}</b><span>${esc(l)}</span></div>`).join('')}</div></div>
 <div class="card"><h2>Récapitulatif — ${esc(D.nom)} — ${esc(per)}</h2>${table(['Matricule','Prénom et nom','Service','Catégorie','Type de contrat','Période','Montant (FCFA)'],[...L.map(l=>`<tr><td>${esc(l.a.mat)}</td><td><b>${esc(nomA(l.a))}</b></td><td>${esc(svc(l.a.serviceId).nom)}</td><td>${esc((poste(l.a.posteId)||{}).nom||'')}</td><td>${esc(l.a.typeContrat||'—')}</td><td>${esc(l.per)}</td><td style="text-align:right"><b>${num(l.v[0])}</b></td></tr>`),...(L.length?[`<tr style="background:var(--bleu-pale)"><td></td><td><b>TOTAL</b></td><td>${na} agent(s)</td><td></td><td></td><td></td><td style="text-align:right"><b>${num(tot)}</b></td></tr>`]:[])],'Aucun montant pour cette rubrique sur la période.')}</div>`}
Object.assign(CHG,{dcP:el=>{const R=S.rem,k=el.dataset.k;R[k]=el.type==='checkbox'?el.checked:el.value;if(k==='p1'&&R.p1>R.p2)R.p2=R.p1;if(k==='p2'&&R.p1>R.p2)R.p1=R.p2;render()}});
Object.assign(ACT,{
 dcXls:()=>{const[h,...rows]=S.tsv||[];if(!rows.length)return toast('Rien à exporter sur cette période.','err');txSortir('xlsx',S.tsvNom.split('_').slice(0,2).join(' '),h,rows,S.tsvNom)},
 dcRac:d=>{const R=dcInit(),[y,m]=R.p2.split('-').map(Number);if(d.k==='m')R.p1=R.p2;else if(d.k==='t'){const q=Math.floor((m-1)/3)*3+1;R.p1=`${y}-${String(q).padStart(2,'0')}`;R.p2=`${y}-${String(Math.min(q+2,12)).padStart(2,'0')}`}else{R.p1=`${y}-01`;R.p2=`${y}-12`}
  const T=today().slice(0,7);if(R.p2>T)R.p2=T;if(R.p1>R.p2)R.p1=R.p2;render()},
 dcPdf:d=>{const R=dcInit(),[h,...rows]=S.tsv||[];if(!rows.length)return toast('Rien à exporter sur cette période.','err');
  const tot=h.map((c,i)=>i<2||/Parts/.test(c)||!rows.every(r=>typeof r[i]==='number')?'':rows.reduce((t,r)=>t+r[i],0));const titre=d.r?`Récapitulatif — ${rrDef(R.rr||'base').nom}`:`Déclaration ${DC_ORG[R.org||'ir'].nom}`;
  sortirPDF(lib=>pdfOfficiel(lib,{simple:true,paysage:h.length>6,date:today(),titre:titre.toUpperCase(),sousTitre:`Période : ${dcPer(R.p1,R.p2)}${R.svc?' · Service : '+svc(R.svc).nom:''}${d.r?'':' · '+DC_ORG[R.org||'ir'].dest}`,
   table:{heads:h,rows:[...rows.map(r=>r.map((c,i)=>typeof c==='number'?(/Parts/.test(h[i])?plFr(c):num(c)):String(c??''))),h.map((c,i)=>i===1?'TOTAL':i===2?`${rows.length} ligne(s)`:tot[i]===''?'':num(tot[i]))],size:h.length>9?6.5:h.length>6?7.5:8.5}}),S.tsvNom+'.pdf')}});
