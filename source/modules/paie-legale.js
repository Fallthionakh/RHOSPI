/* ============ Paie légale (Sénégal) : IPRES / FNR, IPM, IR (CGI art. 173-174), TRIMF, charges patronales ============ */
const PL_DEF={
 ipresRG:5.6,ipresRGPat:8.4,ipresPlaf:432000,ipresRCC:2.4,ipresRCCPat:3.6,ipresRCCPlaf:1296000,
 fnr:12,fnrRCC:2.4,fnrRCCPat:3.6,
 ipmTaux:6,ipmPlaf:250000,
 cssPF:7,cssAT:1,cssPlaf:63000,cfce:3,
 abat:30,abatPlaf:900000,irPlafPct:43,
 bareme:[[630000,0],[1500000,20],[4000000,30],[8000000,35],[13500000,37],[50000000,40],[null,43]],
 reduc:[[1,0,0,0],[1.5,10,100000,300000],[2,15,200000,650000],[2.5,20,300000,1100000],[3,25,400000,1650000],[3.5,30,500000,2030000],[4,35,600000,2490000],[4.5,40,700000,2755000],[5,45,800000,3180000]],
 trimf:[[600000,900],[1000000,3600],[2000000,4800],[7000000,12000],[12000000,18000],[null,36000]]};
NULLS.push('parts');
const PL_IDS=['ipres','css','ipm','impot','trimf'];
const plFr=v=>String(v).replace('.',',');
const plR=v=>Math.round(v);
const plRegime=a=>a.regimeRetraite||(estFonctionnaire(a)?'FNR':'IPRES');
const plCadre=a=>a.cadre==='oui'||(a.cadre!=='non'&&((poste(a.posteId)||{}).categorie||'').toUpperCase()==='A');
function plParts(a){if(estDef(a.parts))return Math.min(5,Math.max(1,Math.floor(+a.parts*2)/2));
 const e=Math.max(0,Math.floor(+a.enfants||0)),p=/mari/i.test(a.matrimoniale||'')?(a.conjointRevenu==='oui'?1.5:2):1;return Math.min(5,p+.5*e)}
function plBareme(rev,B){let t=0,lo=0;for(const[max,tx]of B){const hi=max==null?Infinity:+max;if(rev>lo)t+=(Math.min(rev,hi)-lo)*(+tx)/100;if(rev<=hi)break;lo=hi}return t}
const plTrimf=(ann,T)=>{const l=T.find(([max])=>max==null||ann<=+max);return l?+l[1]:0};
/* Calcul complet pour un brut mensuel ; base = salaire de base (assiette FNR) */
function paieLegale(a,brut,base){const L=DB.params.paieLeg,reg=plRegime(a),cad=plCadre(a),parts=plParts(a),ret={ipres:[],ipm:[],impot:[],trimf:[],css:[]},pat=[],det=[];
 if(reg==='FNR'){const fb=base||brut;ret.ipres.push([`FNR — retenue pour pension (${plFr(L.fnr)} % du salaire de base)`,plR(fb*L.fnr/100)],[`FNR — régime complémentaire (${plFr(L.fnrRCC)} %)`,plR(fb*L.fnrRCC/100)]);pat.push([`FNR — complémentaire, part employeur (${plFr(L.fnrRCCPat)} %)`,plR(fb*L.fnrRCCPat/100)]);
  det.push(`Retraite : fonctionnaire, Fonds national de retraite, sur le salaire de base de ${num(fb)} FCFA.`)}
 else{const a1=Math.min(brut,L.ipresPlaf);ret.ipres.push([`IPRES régime général (${plFr(L.ipresRG)} %)`,plR(a1*L.ipresRG/100)]);pat.push([`IPRES régime général, part employeur (${plFr(L.ipresRGPat)} %)`,plR(a1*L.ipresRGPat/100)]);
  let d=`Retraite IPRES : ${plFr(L.ipresRG)} % de ${num(a1)} FCFA${brut>L.ipresPlaf?` (brut plafonné à ${num(L.ipresPlaf)})`:''}.`;
  if(cad&&brut>L.ipresPlaf){const a2=Math.min(brut,L.ipresRCCPlaf)-L.ipresPlaf;ret.ipres.push([`IPRES cadres, complémentaire (${plFr(L.ipresRCC)} %)`,plR(a2*L.ipresRCC/100)]);pat.push([`IPRES cadres, part employeur (${plFr(L.ipresRCCPat)} %)`,plR(a2*L.ipresRCCPat/100)]);d+=` Cadre : ${plFr(L.ipresRCC)} % sur ${num(a2)} FCFA (tranche ${num(L.ipresPlaf)} – ${num(L.ipresRCCPlaf)}).`}
  det.push(d);
  const im=Math.min(brut,L.ipmPlaf),demi=L.ipmTaux/2;ret.ipm.push([`IPM (${plFr(demi)} % — moitié de ${plFr(L.ipmTaux)} %)`,plR(im*demi/100)]);pat.push([`IPM, part employeur (${plFr(demi)} %)`,plR(im*demi/100)]);
  det.push(`IPM : ${plFr(demi)} % de ${num(im)} FCFA${brut>L.ipmPlaf?` (plafond ${num(L.ipmPlaf)})`:''} ; l'employeur paie la même part.`)}
 const pc=Math.min(brut,L.cssPlaf);pat.push([`CSS prestations familiales (${plFr(L.cssPF)} %)`,plR(pc*L.cssPF/100)],[`CSS accidents du travail (${plFr(L.cssAT)} %)`,plR(pc*L.cssAT/100)]);if(+L.cfce)pat.push([`CFCE (${plFr(L.cfce)} %)`,plR(brut*L.cfce/100)]);
 /* Impôt sur le revenu */
 const ann=brut*12,ab=Math.min(ann*L.abat/100,L.abatPlaf),rev=Math.max(0,Math.floor((ann-ab)/1000)*1000),brutIR=plBareme(rev,L.bareme);
 const rl=L.reduc.slice().reverse().find(r=>parts>=+r[0])||[1,0,0,0],red=+rl[1]?Math.min(brutIR,Math.min(+rl[3],Math.max(+rl[2],brutIR*rl[1]/100))):0;
 const irAn=Math.min(Math.max(0,brutIR-red),rev*L.irPlafPct/100),ir=plR(irAn/12);
 ret.impot.push([`Impôt sur le revenu (${plFr(parts)} part${parts>1?'s':''})`,ir]);
 det.push(`Impôt : brut annuel ${num(ann)} − abattement ${plFr(L.abat)} % (${num(ab)}${ann*L.abat/100>L.abatPlaf?', plafonné':''}) = revenu imposable ${num(rev)} ; barème : ${num(plR(brutIR))} ; réduction pour charges de famille (${plFr(parts)} part${parts>1?'s':''}, ${plFr(rl[1])} %${+rl[1]?`, entre ${num(rl[2])} et ${num(rl[3])}`:''}) : ${num(plR(red))} ; impôt annuel ${num(plR(irAn))}, soit ${num(ir)} par mois.`);
 const tr=plTrimf(ann,L.trimf),trm=plR(tr/12);ret.trimf.push(['TRIMF',trm]);det.push(`TRIMF : ${num(tr)} FCFA par an pour un brut annuel de ${num(ann)}, soit ${num(trm)} par mois.`);
 const tp=pat.reduce((t,g)=>t+g[1],0);return{reg,cad,parts,ret,pat,tp,det,rev,ir,trimf:trm}}

/* ---------- Bulletin : les rubriques légales suivent ce calcul ---------- */
bulletin=function(a,ym){const rec=DB.bulletins[a.id+'|'+ym],{du,au}=moisBornes(ym),S1=l=>l.reduce((t,g)=>t+g[1],0);
 if(rec){const gains=rec.lignes.filter(l=>l.type==='gain').map(l=>[l.nom,+l.montant||0,l.rubId||'',null]),ret=rec.lignes.filter(l=>l.type==='retenue').map(l=>[l.nom,+l.montant||0,l.rubId||'',l.pct??null,!!l.manuel]),brut=S1(gains),retenues=S1(ret);
  return{gains:gains.length?gains:[['Salaire de base',0,'base',null]],brut,ret,retenues,net:brut-retenues,ng:rec.ng||0,actif:true,statut:rec.statut,rec}}
 const rs=DB.rubriques.filter(r=>r.actif!==false).sort((x,y)=>(y.id==='base')-(x.id==='base')),rb=DB.rubriques.find(r=>r.id==='base'),actif=(a.entree||'0')<=au&&(!a.dateDepart||a.dateDepart>=du)&&valRub(a,rb)>0,ng=actif?gardesEntre(a,du,au):0;
 const gains=!actif?[]:rs.filter(r=>r.type==='gain').map(r=>r.id==='garde'?[`${r.nom} (${ng} garde${ng>1?'s':''})`,ng*valRub(a,r),r.id,null]:[r.nom,valRub(a,r),r.id,null]).filter(g=>g[1]>0||g[2]==='base'||g[2]==='garde'),brut=S1(gains);
 const L=brut?paieLegale(a,brut,montantRub({gains},'base')):null;
 const ret=!brut?[]:rs.filter(r=>r.type==='retenue').flatMap(r=>{const s=sourceRub(a,r);
  if(r.mode==='legal'){if(s.src==='propre')return[[r.nom,s.v,r.id,null]];return(L.ret[r.id]||[]).map(([n,v])=>[n,v,r.id,null])}
  const v=s.v;return[r.mode==='pct'?[`${r.nom} (${String(v).replace('.',',')} %)`,Math.round(brut*v/100),r.id,v]:[r.nom,v,r.id,null]]}).filter(g=>g[1]>0),retenues=S1(ret);
 return{gains,brut,ret,retenues,net:brut-retenues,ng,actif,statut:'calculé',legal:L}};
valGrille=(base=>function(db,a,r){return r&&r.mode==='legal'?{v:0,src:'legal'}:base(db,a,r)})(valGrille);
SRCL.legal='calcul légal';

/* ---------- Migration ---------- */
const migratePL=migrate;
migrate=function(db){migratePL(db);const P=db.params;P.paieLeg=Object.assign(JSON.parse(JSON.stringify(PL_DEF)),P.paieLeg||{});
 if(!db.paieLeg1){db.paieLeg1=1;const R=id=>db.rubriques.find(r=>r.id===id);
  [['ipres','Retraite (IPRES ou FNR)'],['ipm','IPM (maladie)'],['impot','Impôt sur le revenu'],['css','CSS (à la charge de l\'employeur)']].forEach(([id,nom])=>{let r=R(id);if(!r){r={id,nom,type:'retenue',actif:true};db.rubriques.push(r)}Object.assign(r,{nom,mode:'legal',montant:0})});
  const c=R('css');if(c)c.actif=false;
  if(!R('trimf')){const i=db.rubriques.findIndex(r=>r.id==='impot');db.rubriques.splice(i+1,0,{id:'trimf',nom:'TRIMF',type:'retenue',mode:'legal',montant:0,actif:true})}
  ['ipres','ipm','impot','css'].forEach(id=>{['cat','fonc'].forEach(g=>Object.values((db.grille||{})[g]||{}).forEach(m=>delete m[id]))});
  (db.agents||[]).forEach(a=>{if(a.paie)PL_IDS.forEach(id=>delete a.paie[id])})}
 return db};

/* ---------- Fiche agent : champs nécessaires au calcul ---------- */
const agentFPL=EDIT.agent.f;
EDIT.agent.f=x=>{const f=agentFPL(x),i=f.findIndex(z=>z[0]==='enfants');f.splice(i<0?f.length:i+1,0,
 ['conjointRevenu','Le conjoint a-t-il des revenus ? (marié)','select',[['','Non (2 parts)'],['oui','Oui (1,5 part)']]],
 ['parts','Nombre de parts fiscales (vide = calcul automatique)','number'],
 ['regimeRetraite','Régime de retraite','select',[['',`Automatique (${estFonctionnaire(x)?'FNR, fonctionnaire':'IPRES'})`],['IPRES','IPRES (contractuel, non fonctionnaire)'],['FNR','FNR (fonctionnaire)']]],
 ['cadre','Statut cadre (IPRES complémentaire)','select',[['','Automatique (catégorie A)'],['oui','Cadre'],['non','Non cadre']]]);return f};

/* ---------- Paramètres : remplacement de la carte « Paie : taux et retenues » ---------- */
const paramsPL=PAGES.params;
PAGES.params=()=>{const h=paramsPL();if(S.pSvc||S.profil.role!=='superadmin')return h;return h.replace(/<div class="card"><h2>Paie : taux et retenues<\/h2>[\s\S]*?service de la solde\.<\/div><\/div>/,plCarte())};
function plCarte(){const L=DB.params.paieLeg,n=(k,l,st=.1)=>`<label class="field">${l}<input type="number" min="0" step="${st}" id="pl_${k}" data-chg="paieLeg" data-k="${k}" value="${L[k]}"></label>`;
 const tb=(t,heads,cells)=>`<div class="tw"><table><thead><tr>${heads.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${L[t].map((row,i)=>`<tr>${cells.map((c,j)=>`<td>${c.last&&i===L[t].length-1&&row[j]==null?'au-delà':`<input type="number" min="0" step="${c.st||1}" style="width:${c.w||120}px" data-chg="plTab" data-t="${t}" data-i="${i}" data-j="${j}" value="${row[j]??''}" aria-label="${c.l}">`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 return`<div class="card"><h2>Paie : cotisations et impôt (législation sénégalaise)</h2>
 <div class="sub" style="margin-bottom:10px">Les bulletins calculent automatiquement retraite, IPM, impôt sur le revenu et TRIMF selon la situation de chaque agent (régime, statut cadre, parts fiscales). Les taux en vigueur au 1er janvier 2026 sont préremplis ; modifiez-les si un texte les change. Les bulletins archivés ne changent pas.</div>
 <h3 style="margin:6px 0">Retraite — IPRES (contractuels, non fonctionnaires)</h3><div class="form">${n('ipresRG','Régime général, part salariale (%)')}${n('ipresRGPat','Régime général, part employeur (%)')}${n('ipresPlaf','Plafond mensuel régime général (FCFA)',1000)}${n('ipresRCC','Cadres, part salariale (%)')}${n('ipresRCCPat','Cadres, part employeur (%)')}${n('ipresRCCPlaf','Plafond mensuel cadres (FCFA)',1000)}</div>
 <h3 style="margin:12px 0 6px">Retraite — FNR (fonctionnaires)</h3><div class="form">${n('fnr','Retenue pour pension (% du salaire de base)')}${n('fnrRCC','Complémentaire, part du fonctionnaire (%)')}${n('fnrRCCPat','Complémentaire, part de l\'administration (%)')}</div><div class="sub">Taux de la retenue pour pension à confirmer sur un bulletin de solde.</div>
 <h3 style="margin:12px 0 6px">Maladie — IPM de l'établissement (non fonctionnaires)</h3><div class="form">${n('ipmTaux','Taux global de l\'IPM (%), partagé à moitié')}${n('ipmPlaf','Plafond mensuel (FCFA)',1000)}</div><div class="sub">Le taux global est fixé par le règlement de votre IPM, entre 4 % et 15 % ; il est divisé à parts égales entre l'agent et l'employeur.</div>
 <h3 style="margin:12px 0 6px">Charges patronales (pas de retenue sur le salaire)</h3><div class="form">${n('cssPF','CSS prestations familiales (%)')}${n('cssAT','CSS accidents du travail (1, 3 ou 5 %)')}${n('cssPlaf','Plafond mensuel CSS (FCFA)',1000)}${n('cfce','CFCE (%), 0 si exonéré')}</div>
 <h3 style="margin:12px 0 6px">Impôt sur le revenu</h3><div class="form">${n('abat','Abattement forfaitaire (%)')}${n('abatPlaf','Plafond annuel de l\'abattement (FCFA)',1000)}${n('irPlafPct','Impôt maximal (% du revenu imposable)')}</div>
 <div class="grid two" style="margin-top:10px"><div><b>Barème annuel (CGI art. 173)</b>${tb('bareme',['Jusqu\'à (FCFA/an)','Taux (%)'],[{l:'Borne',w:140,last:1,st:1000},{l:'Taux',w:80,st:.5}])}</div>
 <div><b>Réduction pour charges de famille (art. 174)</b>${tb('reduc',['Parts','Taux (%)','Minimum','Maximum'],[{l:'Parts',w:80,st:.5},{l:'Taux',w:70},{l:'Minimum',w:110,st:1000},{l:'Maximum',w:110,st:1000}])}</div></div>
 <div style="margin-top:10px;max-width:420px"><b>TRIMF (par an, selon le brut annuel)</b>${tb('trimf',['Brut annuel jusqu\'à','TRIMF (FCFA/an)'],[{l:'Borne',w:140,last:1,st:1000},{l:'Montant',w:110,st:100}])}</div>
 <div class="row" style="margin-top:12px"><button class="btn g s" data-act="plDefaut">Revenir aux taux légaux préremplis</button><span class="sub">Faites valider ces paramètres par le service de la solde.</span></div></div>`}
Object.assign(CHG,{
 paieLeg:el=>{const L=DB.params.paieLeg,k=el.dataset.k,av=L[k];L[k]=Math.max(0,parseFloat(el.value)||0);jp('','','Paramètre de paie modifié',`${k} : ${av} → ${L[k]}`);save();toast('Paramètre enregistré. Les bulletins calculés sont mis à jour.','ok')},
 plTab:el=>{const L=DB.params.paieLeg,t=el.dataset.t,i=+el.dataset.i,j=+el.dataset.j,av=L[t][i][j];L[t][i][j]=el.value===''?(j===0&&i===L[t].length-1?null:0):Math.max(0,parseFloat(el.value)||0);jp('','','Barème de paie modifié',`${t} ligne ${i+1} : ${av} → ${L[t][i][j]}`);save();toast('Barème enregistré.','ok')}});
Object.assign(ACT,{plDefaut:()=>{DB.params.paieLeg=JSON.parse(JSON.stringify(PL_DEF));jp('','','Paramètres de paie','retour aux taux légaux préremplis');save();toast('Taux légaux rétablis.','ok');render()}});

/* ---------- Fiche de rémunération : détail du calcul et coût employeur ---------- */
const remunPL=PAGES.remun;
PAGES.remun=()=>{let h=remunPL().replace('L\'impôt est un taux forfaitaire simplifié, à vérifier avec le service de la solde.','Retraite, IPM, impôt et TRIMF sont calculés selon la législation sénégalaise (paramètres réglables par le super administrateur).');
 const a=ag(S.rem.agentId);if(!a||S.rem.tab&&S.rem.tab!=='bul')return h;const b=bulletin(a,S.rem.ym);if(!b.brut)return h;
 const L=b.legal||paieLegale(a,b.brut,montantRub(b,'base'));
 return h+`<div class="card"><h2>Détail du calcul légal</h2><div class="row" style="margin-bottom:8px">${[['Régime de retraite',L.reg],['Statut',L.reg==='FNR'?'fonctionnaire':L.cad?'cadre':'non cadre'],['Parts fiscales',plFr(L.parts)],['Situation',`${esc(a.matrimoniale||'—')} · ${a.enfants??0} enfant(s)`]].map(([k,v])=>`<span class="pill info">${k} : <b>${v}</b></span>`).join('')}</div>
 <ul style="margin:0 0 10px 18px;line-height:1.6">${L.det.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>${b.statut!=='calculé'?'<div class="sub">Ce bulletin est '+b.statut+' : ses montants ne suivent plus ce calcul.</div>':''}
 <h3 style="margin:8px 0 6px">Charges patronales (à la charge de l'hôpital)</h3><table><tbody>${L.pat.map(g=>`<tr><td>${esc(g[0])}</td><td style="text-align:right">${num(g[1])}</td></tr>`).join('')}<tr><td><b>Total des charges patronales</b></td><td style="text-align:right"><b>${num(L.tp)}</b></td></tr><tr><td><b>Coût total pour l'employeur (brut + charges)</b></td><td style="text-align:right"><b>${fcfa(b.brut+L.tp)}</b></td></tr></tbody></table>
 <div class="sub" style="margin-top:8px">Pour changer le régime, le statut cadre ou les parts : fiche de l'agent, « État civil, contrat et carrière ».</div></div>`};
