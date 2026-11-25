/* ============ Types de contrat, statut universitaire, import/export Excel et PDF ============ */
ADDK.contrat={t:'Nouveau type de contrat'};ADDK.univ={t:'Nouveau statut universitaire'};
const migrateIX=migrate;
migrate=function(db){migrateIX(db);const L=db.listes;L.statutsUniv=L.statutsUniv||['Universitaire','Non universitaire'];
 if(!db.listesV2){db.listesV2=1;const base=['Étatique','CMSAS','CDD','CDI','Stagiaire','Vacataire'];L.typesContrat=[...base,...(L.typesContrat||[]).filter(x=>!base.some(b=>kNorm(b)===kNorm(x)))]}
 return db};
const agentFIX=EDIT.agent.f;
EDIT.agent.f=x=>{const f=agentFIX(x),i=f.findIndex(z=>z[0]==='typeContrat');if(i>=0){f[i]=['typeContrat','Type de contrat','select',[['','—'],...DB.listes.typesContrat.map(z=>[z,z])],'contrat'];f.splice(i+1,0,['univ','Statut universitaire','select',[['','—'],...DB.listes.statutsUniv.map(z=>[z,z])],'univ'])}return f};

/* ---------- Rubriques réservées à des types de contrat / statuts universitaires ---------- */
rubEtat=function(a,r){const o=(a.rubOn||{})[r.id];if(o===true||o===false)return{on:o,src:'agent'};
 const R=(DB.rubRegles||[]).slice().reverse().find(g=>g.rubs[r.id]&&raMatch(a,g));if(R)return{on:R.rubs[r.id].on,src:'regle',regle:R};
 const lc=r.contrats||[],lu=r.univs||[];if(lc.length&&!lc.includes(a.typeContrat||''))return{on:false,src:'rub',why:'rubrique réservée aux contrats : '+lc.join(', ')};
 if(lu.length&&!lu.includes(a.univ||''))return{on:false,src:'rub',why:'rubrique réservée aux agents : '+lu.join(', ')};return{on:true,src:'defaut'}};
function rlPage(e){const dis=e?'':' disabled',C=DB.listes.typesContrat,U=DB.listes.statutsUniv,T=today(),act=DB.agents.filter(a=>enPoste(a,T)),rubs=DB.rubriques.filter(r=>r.actif!==false);
 const ck=(r,k,v)=>`<td style="text-align:center"><input type="checkbox" data-chg="rbLim" data-r="${r.id}" data-k="${k}" data-v="${esc(v)}"${(r[k]||[]).includes(v)?' checked':''}${dis} aria-label="${esc(r.nom+' — '+v)}"></td>`;
 const res=r=>{const c=r.contrats||[],u=r.univs||[];return!c.length&&!u.length?'<span class="pill ok">tous</span>':[c.length?c.join(', '):'',u.length?u.join(', '):''].filter(Boolean).map(x=>`<span class="pill info">${esc(x)}</span>`).join(' ')};
 const nb=f=>act.filter(f).length;
 return`<div class="card"><div class="head" style="margin-bottom:6px"><h2>5 · Types de contrat et statut universitaire des rubriques</h2><span class="sp"></span>${e?'<button class="btn g s" data-act="addList" data-kind="contrat">+ Type de contrat</button> <button class="btn g s" data-act="addList" data-kind="univ">+ Statut universitaire</button>':''}</div>
 <div class="sub" style="margin-bottom:10px">Cochez à qui chaque rubrique est versée. Aucune case cochée dans un groupe = tous les agents. Les règles (partie 6) et les choix par agent (partie 7) passent avant ces cases. Le type de contrat et le statut universitaire de chaque agent se renseignent dans sa fiche.</div>
 <div class="tw"><table><thead><tr><th>Rubrique</th>${C.map(c=>`<th style="text-align:center">${esc(c)}<br><span class="sub" style="text-transform:none">${nb(a=>(a.typeContrat||'')===c)} agent(s)</span></th>`).join('')}${U.map(u=>`<th style="text-align:center;background:var(--bleu-pale)">${esc(u)}<br><span class="sub" style="text-transform:none">${nb(a=>(a.univ||'')===u)} agent(s)</span></th>`).join('')}<th>S'applique à</th></tr></thead>
 <tbody>${rubs.map(r=>`<tr><td><b>${esc(r.nom)}</b><br><span class="sub">${r.type==='gain'?'gain':'retenue'}</span></td>${C.map(c=>ck(r,'contrats',c)).join('')}${U.map(u=>ck(r,'univs',u)).join('')}<td>${res(r)}</td></tr>`).join('')}</tbody></table></div></div>`}
CHG.rbLim=el=>{const r=DB.rubriques.find(x=>x.id===el.dataset.r),k=el.dataset.k,v=el.dataset.v;r[k]=(r[k]||[]).filter(x=>x!==v);if(el.checked)r[k].push(v);if(!r[k].length)delete r[k];
 jp('','',k==='contrats'?'Types de contrat d\'une rubrique':'Statut universitaire d\'une rubrique',`${r.nom} : ${(r[k]||[]).join(', ')||'tous'}`);save();toast('Enregistré. Les bulletins calculés sont mis à jour.','ok');render()};

/* ---------- Lecture Excel ---------- */
const ixN=s=>kNorm(String(s??'')).replace(/[^a-z0-9]+/g,' ').trim();
const ixNum=v=>{if(typeof v==='number')return v;const s=String(v??'').replace(/[\s  ]/g,'').replace(/fcfa|f$/i,'').replace(',','.');return/^-?\d+(\.\d+)?$/.test(s)?+s:NaN};
const ixDate=v=>{if(v instanceof Date&&!isNaN(v))return`${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
 if(typeof v==='number'&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+v*864e5);return d.toISOString().slice(0,10)}
 const s=String(v??'').trim();let m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);if(m)return`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[0]:''};
const IX_F=[['mat','Matricule',/^(matricule|mat|n matricule|no matricule|numero matricule|id agent|identifiant)$/],['prenom','Prénom',/^prenoms?$/],['nom','Nom',/^(nom|noms|nom de famille)$/],
 ['nomComplet','Prénom et nom (une seule colonne)',/^(prenom et nom|prenoms et nom|nom et prenoms?|nom complet|agent|nom prenoms?|prenoms? nom|noms? et prenoms?)$/],['sexe','Sexe',/^(sexe|genre)$/],['tel','Téléphone',/^(tel|telephone|portable|contact|numero de telephone)$/],
 ['email','Adresse électronique',/^(e ?mail|courriel|adresse electronique|adresse mail)$/],['naissance','Date de naissance',/^(date de naissance|ne le|ne e le|naissance)$/],['entree','Date d\'entrée',/^(date d ?entree|entree|date de recrutement|date d embauche|date de prise de service)$/],
 ['serviceId','Service',/^(service|unite|service d affectation)$/],['posteId','Catégorie socio-professionnelle',/^(categorie|categorie socio ?professionnelle|csp|profession|emploi|qualification)$/],['fonctionId','Poste',/^(poste|fonction|poste occupe)$/],
 ['statut','Statut administratif',/^(statut|statut administratif)$/],['typeContrat','Type de contrat',/^(type de contrat|contrat|nature du contrat)$/],['univ','Statut universitaire',/^(statut universitaire|universitaire|hospitalo universitaire)$/],
 ['matrimoniale','Situation matrimoniale',/^(situation matrimoniale|situation familiale|etat civil|situation de famille)$/],['enfants','Nombre d\'enfants',/^(nombre d enfants|enfants|nb enfants|enfants a charge)$/]];
const IX_IGN=/^(n|no|numero|n o|ordre|total|totaux|brut|salaire brut|net|net a payer|net a percevoir|total retenues|total des retenues|total gains|total des gains|cout employeur)$/;
const IX_RET=/retenue|ipres|ipm|impot|cotisation|avance|pret|trimf|fnr|css|mutuelle|opposition|saisie/;
function ixAuto(h,vals){const n=ixN(h);if(!n)return'ign';const f=IX_F.find(z=>z[2].test(n));if(f)return'f:'+f[0];if(IX_IGN.test(n))return'ign';
 const r=DB.rubriques.find(x=>ixN(x.nom)===n||ixN(x.id)===n)||DB.rubriques.find(x=>{const m=ixN(x.nom);return m.length>4&&(n.includes(m)||m.includes(n))});if(r)return'r:'+r.id;
 const nums=vals.filter(v=>String(v).trim()!=='');return nums.length&&nums.filter(v=>!isNaN(ixNum(v))).length>=nums.length*.6?(IX_RET.test(n)?'new:retenue':'new:gain'):'ign'}
async function ixLire(f){try{await loadXLSX()}catch(e){toast('Le module Excel n\'a pas pu être chargé. Vérifiez la connexion puis réessayez.','err');return null}
 let wb;try{wb=window.XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true})}catch(e){toast('Ce fichier n\'a pas pu être lu. Utilisez un fichier .xlsx, .xls ou .csv.','err');return null}
 const ws=wb.Sheets[wb.SheetNames[0]],A=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true}).filter(r=>r.some(c=>String(c).trim()!==''));
 const hi=A.slice(0,12).findIndex(r=>r.filter(c=>typeof c==='string'&&c.trim()).length>=2);if(hi<0||A.length<hi+2){toast('Aucun tableau reconnu : la première ligne doit contenir les titres des colonnes, puis une ligne par agent.','err');return null}
 const w=Math.max(...A.slice(hi).map(r=>r.length)),cols=Array.from({length:w},(_,i)=>String(A[hi][i]??'').trim()||`Colonne ${i+1}`),data=A.slice(hi+1).map(r=>Array.from({length:w},(_,i)=>r[i]??''));
 return{nom:f.name,feuille:wb.SheetNames[0],cols,data}}
/* ---------- Écran de correspondance (« visionner » le fichier, choisir les rubriques à importer) ---------- */
function ixOuvrir(X,src){const map=X.cols.map((h,i)=>ixAuto(h,X.data.slice(0,30).map(r=>r[i])));S.ix={...X,src,map,on:map.map(m=>m!=='ign'),creer:src==='agents'};ixModal()}
const ixOpts=cur=>{const o=(v,l)=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`,rubs=DB.rubriques.filter(r=>r.actif!==false||cur==='r:'+r.id);
 return o('ign','— Ignorer cette colonne')+`<optgroup label="Information de l'agent">${IX_F.map(f=>o('f:'+f[0],f[1])).join('')}</optgroup><optgroup label="Rubrique existante dans RHOSPI">${rubs.map(r=>o('r:'+r.id,r.nom+(r.mode==='legal'?' (montant fixe à la place du calcul légal)':r.mode==='pct'?' (taux en %)':''))).join('')}</optgroup><optgroup label="Nouvelle rubrique à créer">${o('new:gain','Créer comme gain (prime, indemnité…)')}${o('new:retenue','Créer comme retenue')}</optgroup>`};
function ixCle(){const X=S.ix,i=k=>X.map.findIndex((m,j)=>m==='f:'+k&&X.on[j]);return{im:i('mat'),ip:i('prenom'),in:i('nom'),ic:i('nomComplet')}}
function ixAgent(r,K){if(K.im>=0){const m=String(r[K.im]).trim();if(m)return DB.agents.find(a=>String(a.mat).trim()===m)||null}
 const nm=K.ic>=0?ixN(r[K.ic]):K.ip>=0&&K.in>=0?ixN(r[K.ip]+' '+r[K.in]):'';if(!nm)return null;const l=DB.agents.filter(a=>ixN(a.prenom+' '+a.nom)===nm||ixN(a.nom+' '+a.prenom)===nm);return l.length===1?l[0]:null}
function ixResume(){const X=S.ix,K=ixCle(),R={lus:X.data.length,trouves:0,nouveaux:0,ignores:[],rubNew:[],rubExist:[]};
 X.map.forEach((m,i)=>{if(!X.on[i])return;if(m.startsWith('new:'))R.rubNew.push(X.cols[i]+' ('+(m==='new:gain'?'gain':'retenue')+')');else if(m.startsWith('r:'))R.rubExist.push(DB.rubriques.find(r=>r.id===m.slice(2)).nom)});
 X.data.forEach((r,n)=>{const a=ixAgent(r,K);if(a)R.trouves++;else{const m=K.im>=0?String(r[K.im]).trim():'',ok=m&&(K.ic>=0?String(r[K.ic]).trim():K.ip>=0&&K.in>=0&&String(r[K.ip]).trim()&&String(r[K.in]).trim());if(X.creer&&ok&&!DB.agents.some(a=>a.mat===m))R.nouveaux++;else R.ignores.push(`ligne ${n+2}${m?' (matricule '+m+')':''}`)}});return R}
function ixResumeHTML(){const R=ixResume(),K=ixCle();
 return`<div class="grid kpis">${[[R.lus,'Lignes lues'],[R.trouves,'Agents reconnus'],[R.nouveaux,'Agents à créer'],[R.ignores.length,'Lignes ignorées']].map(([v,l],i)=>`<div class="kpi${i===3&&v?' warn':''}" style="cursor:default"><b style="font-size:20px">${v}</b><span>${l}</span></div>`).join('')}</div>
 ${K.im<0&&K.ic<0&&(K.ip<0||K.in<0)?'<div class="alert crit" style="margin-top:8px">Indiquez la colonne du matricule (ou du prénom et du nom) pour reconnaître les agents.</div>':''}
 ${R.rubExist.length?`<div style="margin-top:8px"><b>Rubriques existantes alimentées :</b> ${R.rubExist.map(x=>`<span class="pill ok">${esc(x)}</span>`).join(' ')}</div>`:''}${R.rubNew.length?`<div style="margin-top:6px"><b>Nouvelles rubriques ajoutées à RHOSPI :</b> ${R.rubNew.map(x=>`<span class="pill info">+ ${esc(x)}</span>`).join(' ')}</div>`:''}
 ${R.ignores.length?`<div class="sub" style="margin-top:6px">Lignes ignorées (agent non reconnu${S.ix.creer?' et données insuffisantes pour le créer':''}) : ${esc(R.ignores.slice(0,12).join(', '))}${R.ignores.length>12?'…':''}</div>`:''}`}
function ixModal(){const X=S.ix,ex=i=>X.data.map(r=>r[i]).filter(v=>String(v).trim()!=='').slice(0,3).map(v=>v instanceof Date?dfr(ixDate(v)):String(v)).join(' · ');
 const etat=(m,i)=>m.startsWith('r:')?'<span class="pill ok">existe dans RHOSPI</span>':m.startsWith('new:')?'<span class="pill info">nouvelle rubrique</span>':m.startsWith('f:')?'<span class="pill">fiche agent</span>':'<span class="sub">ignorée</span>';
 modal('Importer depuis Excel',`<div class="sub" style="margin-bottom:8px">Fichier « ${esc(X.nom)} », feuille « ${esc(X.feuille)} » : ${X.cols.length} colonnes, ${X.data.length} lignes. Pour chaque colonne, choisissez ce qu'elle représente et cochez celles à importer.</div>
 <div class="tw noexp"><table><thead><tr><th>Importer</th><th>Colonne du fichier</th><th>Exemples</th><th>Correspond à</th><th>Dans RHOSPI</th></tr></thead><tbody>${X.cols.map((h,i)=>`<tr><td style="text-align:center"><input type="checkbox" data-chg="ixOn" data-i="${i}"${X.on[i]?' checked':''} aria-label="Importer ${esc(h)}"></td><td><b>${esc(h)}</b></td><td class="sub">${esc(ex(i))}</td><td><select data-chg="ixMap" data-i="${i}" style="min-width:230px">${ixOpts(X.map[i])}</select></td><td>${etat(X.map[i],i)}</td></tr>`).join('')}</tbody></table></div>
 <label class="row" style="margin:10px 0;gap:8px"><input type="checkbox" data-chg="ixCreer"${X.creer?' checked':''}> Créer les agents absents de RHOSPI (matricule, prénom et nom obligatoires)</label>
 <div class="sub" style="margin-bottom:6px">Pour un agent déjà présent, le service, la catégorie et le poste ne sont pas modifiés (utilisez « Mouvement » dans sa fiche) ; les autres informations et les montants non vides remplacent les valeurs actuelles. Les montants importés deviennent des montants propres à l'agent.</div>
 <div id="ix_sum">${ixResumeHTML()}</div>
 <h3 style="margin:12px 0 6px">Aperçu du fichier</h3><div class="tw noexp"><table><thead><tr>${X.cols.map((h,i)=>`<th${X.on[i]?'':' style="opacity:.45"'}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${X.data.slice(0,8).map(r=>`<tr>${r.map((v,i)=>`<td${X.on[i]?'':' style="opacity:.45"'}>${esc(v instanceof Date?dfr(ixDate(v)):String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${X.data.length>8?`<div class="sub">… et ${X.data.length-8} autre(s) ligne(s).</div>`:''}`,
 `<button class="btn g" data-act="close">Annuler</button><button class="btn" data-act="ixOk">Importer</button>`);ixLarge()}
const ixLarge=()=>{const d=typeof document!=='undefined'&&document.querySelector('#layer [role=dialog]');if(d){d.style.width='min(1120px,96vw)';d.style.maxWidth='min(1120px,96vw)'}};
Object.assign(CHG,{
 ixFile:async el=>{const f=el.files[0],src=el.dataset.src;el.value='';if(!f)return;const X=await ixLire(f);if(X)ixOuvrir(X,src)},
 ixMap:el=>{const i=+el.dataset.i;S.ix.map[i]=el.value;S.ix.on[i]=el.value!=='ign';ixModal()},
 ixOn:el=>{S.ix.on[+el.dataset.i]=el.checked;const s=document.getElementById('ix_sum');if(s)s.innerHTML=ixResumeHTML()},
 ixCreer:el=>{S.ix.creer=el.checked;const s=document.getElementById('ix_sum');if(s)s.innerHTML=ixResumeHTML()}});
function ixListe(kind,list,v,cree){if(!v)return'';const l=DB.listes[list],x=l.find(z=>kNorm(z)===kNorm(v));if(x)return x;l.push(v);cree.push(`${ADDK[kind]?ADDK[kind].t.replace(/^Nouveau |^Nouvelle /,''):list} : ${v}`);return v}
function ixRef(k,v,cree){const n=ixN(v);if(!n)return'';
 if(k==='serviceId'){const s=DB.services.find(x=>ixN(x.code)===n||ixN(x.nom)===n);if(s)return s.id;let code=String(v).replace(/[^A-Za-zÀ-ÿ0-9]/g,'').slice(0,5).toUpperCase()||'SVC';while(svc(code)&&svc(code).id===code)code+='1';DB.services.push({id:code,code,nom:String(v).trim(),type:'soins',pole:'',theorique:0,min:1,actif:true,chef:null,major:null});cree.push('service : '+v);return code}
 if(k==='posteId'){const p=DB.postes.find(x=>ixN(x.nom)===n||ixN(x.code)===n);if(p)return p.id;const id='C'+uid();DB.postes.push({id,code:String(v).replace(/[^A-Za-zÀ-ÿ]/g,'').slice(0,4).toUpperCase(),nom:String(v).trim(),categorie:'',corps:'',horaires:'',actif:true});cree.push('catégorie : '+v);return id}
 if(k==='fonctionId'){const f=DB.fonctions.find(x=>ixN(x.nom)===n);if(f)return f.id;const id='F'+uid();DB.fonctions.push({id,nom:String(v).trim()});cree.push('poste : '+v);return id}}
function ixValeur(a,k,v,cree){const s=v instanceof Date?'':String(v??'').trim();if(s===''&&!(v instanceof Date))return;
 if(k==='sexe'){a.sexe=/^(f|fem)/i.test(s)?'F':/^(m|h|mas|hom)/i.test(s)?'M':a.sexe;return}
 if(k==='naissance'||k==='entree'){const d=ixDate(v);if(d)a[k]=d;return}
 if(k==='enfants'){const n=ixNum(v);if(!isNaN(n))a.enfants=Math.max(0,Math.round(n));return}
 if(k==='statut'){a.statut=ixListe('statut','statuts',s,cree);return}if(k==='typeContrat'){a.typeContrat=ixListe('contrat','typesContrat',s,cree);return}if(k==='univ'){a.univ=ixListe('univ','statutsUniv',s,cree);return}
 if(k==='matrimoniale'){a.matrimoniale=ixListe('matri','matrimoniales',s,cree);return}
 if(['serviceId','posteId','fonctionId'].includes(k)){a[k]=ixRef(k,s,cree);return}
 if(k==='tel'){a.tel=s;return}a[k]=s}
ADDK.matri=ADDK.matri||{t:'Nouvelle situation matrimoniale'};
ACT.ixOk=()=>{const X=S.ix,K=ixCle();if(K.im<0&&K.ic<0&&(K.ip<0||K.in<0))return toast('Indiquez la colonne du matricule (ou du prénom et du nom).','err');
 const cols=X.map.map((m,i)=>X.on[i]&&m!=='ign'?{i,m}:null).filter(Boolean),cree=[],rubCree=[];
 cols.forEach(c=>{if(!c.m.startsWith('new:'))return;const type=c.m.slice(4),nom=X.cols[c.i],ex=DB.rubriques.find(r=>ixN(r.nom)===ixN(nom));if(ex){c.rid=ex.id;return}
  const r={id:'R'+uid(),nom,type,mode:'fixe',montant:0,actif:true};if(type==='gain'){const k=DB.rubriques.findIndex(x=>x.type==='retenue');DB.rubriques.splice(k<0?DB.rubriques.length:k,0,r)}else DB.rubriques.push(r);c.rid=r.id;rubCree.push(nom)});
 cols.forEach(c=>{if(c.m.startsWith('r:'))c.rid=c.m.slice(2)});
 let maj=0,nv=0,mont=0;const ign=[];
 X.data.forEach((r,n)=>{let a=ixAgent(r,K);
  if(!a){const m=K.im>=0?String(r[K.im]).trim():'';let pre='',nom='';if(K.ic>=0){const p=String(r[K.ic]).trim().split(/\s+/);nom=p.pop()||'';pre=p.join(' ')}else{pre=K.ip>=0?String(r[K.ip]).trim():'';nom=K.in>=0?String(r[K.in]).trim():''}
   if(!X.creer||!m||!pre||!nom||DB.agents.some(z=>z.mat===m)){ign.push(n+2);return}
   a={id:m,mat:m,prenom:pre,nom,sexe:'F',tel:'',corps:'',grade:'',statut:DB.listes.statuts[0],entree:today(),serviceId:'',posteId:'',fonctionId:'',situation:'en activité',pin:String(1000+Math.floor(Math.random()*9000))};a._nouveau=1}
  else maj++;
  cols.forEach(({i,m,rid})=>{const v=r[i];if(m.startsWith('f:')){const k=m.slice(2);if(['mat','nomComplet'].includes(k)||!a._nouveau&&['serviceId','posteId','fonctionId'].includes(k))return;if(a._nouveau&&(k==='prenom'||k==='nom'))return;ixValeur(a,k,v,cree);return}
   const x=ixNum(v);if(isNaN(x))return;const L=LEG[rid];if(L)a[L]=x;else(a.paie=a.paie||{})[rid]=x;mont++});
  if(a._nouveau){delete a._nouveau;a.serviceId=a.serviceId||(DB.services.find(s=>s.actif)||DB.services[0]).id;a.posteId=a.posteId||DB.postes[0].id;a.fonctionId=a.fonctionId||(DB.fonctions[0]||{}).id||'';a.corps=(poste(a.posteId)||{}).corps||'';
   DB.agents.push(a);DB.affectations.push({id:uid(),agentId:a.id,serviceId:a.serviceId,posteId:a.posteId,fonctionId:a.fonctionId,debut:a.entree,fin:null,motif:'Prise de service (import Excel)',ref:'',par:who()});nv++}});
 const det=`${X.nom} : ${maj} agent(s) mis à jour, ${nv} créé(s), ${mont} montant(s), ${rubCree.length} rubrique(s) créée(s)${rubCree.length?' ('+rubCree.join(', ')+')':''}${cree.length?', ajouts aux listes : '+cree.join(', '):''}`;
 audit('Import Excel',det);jp('','','Import Excel',det);save();closeModal();
 modal('Import terminé',`<div class="grid kpis">${[[maj,'Agents mis à jour'],[nv,'Agents créés'],[mont,'Montants importés'],[rubCree.length,'Rubriques créées'],[ign.length,'Lignes ignorées']].map(([v,l],i)=>`<div class="kpi${i===4&&v?' warn':''}" style="cursor:default"><b style="font-size:20px">${v}</b><span>${l}</span></div>`).join('')}</div>
  ${rubCree.length?`<p><b>Nouvelles rubriques :</b> ${rubCree.map(esc).join(', ')}. Vérifiez-les dans Rémunérations › Rubriques et grilles.</p>`:''}${cree.length?`<p><b>Ajouté aux listes :</b> ${cree.map(esc).join(', ')}.</p>`:''}${ign.length?`<p class="sub">Lignes ignorées : ${ign.slice(0,30).join(', ')}${ign.length>30?'…':''}.</p>`:''}${nv?'<p class="sub">Les agents créés ont un PIN provisoire : pensez à les programmer au planning.</p>':''}`,`<button class="btn" data-act="close">Fermer</button>`);render()};

/* ---------- Export des rubriques (choix des rubriques, des agents, Excel ou PDF) ---------- */
const IX_AG=[['mat','Matricule',a=>a.mat],['prenom','Prénom',a=>a.prenom],['nom','Nom',a=>a.nom],['svc','Service',a=>svc(a.serviceId).nom],['cat','Catégorie socio-professionnelle',a=>(poste(a.posteId)||{}).nom||''],['statut','Statut administratif',a=>a.statut||''],['contrat','Type de contrat',a=>a.typeContrat||''],['univ','Statut universitaire',a=>a.univ||''],['tel','Téléphone',a=>a.tel||'']];
ACT.ixExp=()=>{const T=today(),ym=S.rem&&S.rem.ym||T.slice(0,7),rubs=DB.rubriques.filter(r=>r.actif!==false),ck=(cls,v,l,on=true)=>`<label class="row" style="gap:6px"><input type="checkbox" class="${cls}" value="${esc(v)}"${on?' checked':''}> ${esc(l)}</label>`;
 modal('Exporter les rubriques',`<div class="sub" style="margin-bottom:8px">Le fichier Excel exporté peut être modifié puis réimporté (même titres de colonnes).</div>
 <div class="grid two"><div><div class="row"><b>Rubriques à exporter</b><span class="sp"></span><button class="btn g s" data-act="ixTout" data-c="ixe_r">Tout / rien</button></div><div style="display:grid;gap:4px;margin-top:6px">${rubs.map(r=>ck('ixe_r',r.id,r.nom+(r.type==='retenue'?' (retenue)':''))).join('')}</div></div>
 <div><div class="row"><b>Informations de l'agent</b><span class="sp"></span><button class="btn g s" data-act="ixTout" data-c="ixe_a">Tout / rien</button></div><div style="display:grid;gap:4px;margin-top:6px">${IX_AG.map(([k,l])=>ck('ixe_a',k,l,['mat','prenom','nom','svc','contrat'].includes(k))).join('')}</div>
 <div class="form" style="margin-top:10px"><label class="field">Service<select id="ixe_svc"><option value="">Tous les services</option>${opt(DB.services.filter(s=>scope().includes(s.id)),'',s=>[s.id,s.nom])}</select></label>
 <label class="field">Type de contrat<select id="ixe_ct"><option value="">Tous</option>${opt(DB.listes.typesContrat,'')}</select></label><label class="field">Statut universitaire<select id="ixe_un"><option value="">Tous</option>${opt(DB.listes.statutsUniv,'')}</select></label>
 <label class="field">Montants<select id="ixe_src"><option value="param">Montants paramétrés (propres, règles, grilles)</option><option value="bul">Bulletin du mois ${esc(moisLib(ym))}</option></select></label></div></div></div>`,
 `<button class="btn g" data-act="close">Annuler</button><button class="btn g" data-act="ixExpGo" data-f="pdf">Exporter en PDF</button><button class="btn" data-act="ixExpGo" data-f="xlsx">Exporter en Excel</button>`)};
ACT.ixTout=d=>{const l=[...document.querySelectorAll('.'+d.c)],on=!l.every(c=>c.checked);l.forEach(c=>c.checked=on)};
ACT.ixExpGo=async d=>{const T=today(),ym=S.rem&&S.rem.ym||T.slice(0,7),R=[...document.querySelectorAll('.ixe_r:checked')].map(c=>DB.rubriques.find(r=>r.id===c.value)),F=[...document.querySelectorAll('.ixe_a:checked')].map(c=>IX_AG.find(z=>z[0]===c.value));
 if(!R.length)return toast('Cochez au moins une rubrique.','err');const sv=val('ixe_svc'),ct=val('ixe_ct'),un=val('ixe_un'),src=val('ixe_src');
 const as=DB.agents.filter(a=>enPoste(a,T)&&scope().includes(a.serviceId)&&(!sv||a.serviceId===sv)&&(!ct||a.typeContrat===ct)&&(!un||a.univ===un)).sort((x,y)=>String(x.mat).localeCompare(String(y.mat)));
 if(!as.length)return toast('Aucun agent ne correspond à ces critères.','err');
 const v=(a,r)=>{if(src==='bul'){const b=bulletin(a,ym);return mtRub(b,r.id)||''}if(!rubApplique(a,r))return'';const s=sourceRub(a,r);if(r.mode==='legal'&&s.src!=='propre'&&s.src!=='regle')return'';return s.v||''};
 const heads=[...F.map(f=>f[1]),...R.map(r=>r.nom+(r.mode==='pct'&&src!=='bul'?' (%)':''))],rows=as.map(a=>[...F.map(f=>f[2](a)),...R.map(r=>v(a,r))]);
 const titre=`Rubriques de paie${src==='bul'?' — bulletins de '+moisLib(ym):''}`;closeModal();
 await txSortir(d.f,titre,heads,rows,`Rubriques_${src==='bul'?ym:T}`)};
ACT.ixModele=async()=>{await txSortir('xlsx','Modèle',['Matricule','Prénom','Nom','Type de contrat','Statut universitaire',...DB.rubriques.filter(r=>r.actif!==false&&r.mode!=='legal').map(r=>r.nom)],DB.agents.filter(a=>enPoste(a,today())).slice(0,3).map(a=>[a.mat,a.prenom,a.nom,a.typeContrat||'',a.univ||'']),'Modele_import_rubriques')};

/* ---------- Export générique de toutes les listes (Excel et PDF) ---------- */
async function txSortir(f,titre,heads,rows,nom){nom=String(nom).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_.-]+/g,'_');
 if(f==='pdf')return sortirPDF(lib=>pdfOfficiel(lib,{simple:true,paysage:heads.length>5,date:today(),titre:titre.toUpperCase(),table:{heads,rows:rows.map(r=>r.map(c=>typeof c==='number'?num(c):String(c??''))),size:heads.length>9?6.5:heads.length>6?7.5:8.5}}),nom+'.pdf');
 try{await loadXLSX()}catch(e){toast('Le module Excel n\'a pas pu être chargé : export en CSV.','err');return exportCSV(nom,[heads,...rows])}
 const X=window.XLSX,ws=X.utils.aoa_to_sheet([heads,...rows]);ws['!cols']=heads.map((h,i)=>({wch:Math.min(45,Math.max(10,String(h).length+2,...rows.slice(0,200).map(r=>String(r[i]??'').length+1)))}));
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,titre.replace(/[\\\/?*\[\]:]/g,' ').slice(0,31)||'Liste');await telecharger(nom+'.xlsx',new Blob([X.write(wb,{bookType:'xlsx',type:'array'})]))}
function txCellule(td){const c=td.cloneNode(true);c.querySelectorAll('button,.txbar,script,[data-noexp]').forEach(x=>x.remove());
 const s=td.querySelector('select');if(s)return s.selectedIndex>=0?s.options[s.selectedIndex].text:'';const cb=td.querySelector('input[type=checkbox]');if(cb&&!c.textContent.trim())return cb.checked?'oui':'';const i=td.querySelector('input:not([type=checkbox]),textarea');if(i)return i.value;
 const t=(c.innerText??c.textContent??'').replace(/\s*\n\s*/g,' · ').trim(),n=t.replace(/(\s| | )(FCFA|F)$/,'');return/^-?\d{1,3}([\s  ]\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(n)&&!/^0\d/.test(n)?+n.replace(/[\s  ]/g,'').replace(',','.'):t}
function txLire(w){const t=w.querySelector('table'),hs=[...t.querySelectorAll('thead th')].map(th=>{const c=th.cloneNode(true);c.querySelectorAll('br').forEach(x=>x.replaceWith(' '));return c.textContent.replace(/\s+/g,' ').trim()});
 const keep=hs.map((h,i)=>h&&!/^(actions?|)$/i.test(h)?i:-1).filter(i=>i>=0),rows=[...t.tBodies[0].rows].filter(tr=>tr.style.display!=='none'&&!tr.hidden).map(tr=>{const td=[...tr.cells];return keep.map(i=>{const v=td[i]?txCellule(td[i]):'';return typeof v==='number'&&/matricule|t[ée]l[ée]phone|code|n°|t[ée]l$/i.test(hs[i])?String(td[i].textContent).trim():v})});
 const card=w.closest('.card'),h=card&&card.querySelector('h2'),h1=document.querySelector('.main h1');return{heads:keep.map(i=>hs[i]),rows,titre:((h&&h.textContent)||(h1&&h1.textContent)||'Liste').replace(/^\d+\s*·\s*/,'').trim()}}
Object.assign(ACT,{tXls:(d,b)=>{const L=txLire(b.closest('.txbar').nextElementSibling);txSortir('xlsx',L.titre,L.heads,L.rows,L.titre+'_'+today())},
 tPdf:(d,b)=>{const L=txLire(b.closest('.txbar').nextElementSibling);txSortir('pdf',L.titre,L.heads,L.rows,L.titre+'_'+today())}});
function txBars(){document.querySelectorAll('.tw').forEach(w=>{if(w.dataset.tx||w.classList.contains('noexp')||w.closest('.noexp,.kiosk,#bnav'))return;const t=w.querySelector('table');if(!t||t.classList.contains('p-tab')||!t.tBodies[0]||t.tBodies[0].rows.length<1||!t.querySelector('thead th'))return;
 w.dataset.tx=1;const b=document.createElement('div');b.className='txbar';b.innerHTML='<button type="button" class="txb" data-act="tXls" title="Exporter cette liste en Excel">Excel</button><button type="button" class="txb" data-act="tPdf" title="Exporter cette liste en PDF">PDF</button>';w.parentNode.insertBefore(b,w)})}
if(typeof MutationObserver!=='undefined'&&typeof document!=='undefined'){let txT=null;new MutationObserver(()=>{clearTimeout(txT);txT=setTimeout(txBars,60)}).observe(document.documentElement,{childList:true,subtree:true})}
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent='.txbar{display:flex;justify-content:flex-end;gap:6px;margin:0 0 6px}.txb{font:600 11.5px/1 inherit;font-family:inherit;padding:5px 10px;border-radius:999px;border:1px solid var(--line,#dfe5ee);background:var(--card,#fff);color:var(--sub,#5b6b80);cursor:pointer;display:inline-flex;align-items:center;gap:5px}.txb::before{content:"⤓";font-size:12px}.txb:hover{border-color:var(--bleu,#2563eb);color:var(--bleu,#2563eb)}@media print{.txbar{display:none}}';document.head&&document.head.appendChild(st)}

/* ---------- Boutons d'import / export ---------- */
const ixBtns=src=>`<label class="btn g s">Importer (Excel)<input type="file" accept=".xlsx,.xls,.csv" data-chg="ixFile" data-src="${src}" hidden></label>`;
rubPage=(f=>e=>f(e).replace(/<div class="card" style="border-left:4px solid var\(--bleu\)"><h2>5 · Attribuer/,m=>rlPage(e)+m.replace('5 · Attribuer','6 · Attribuer')).replace('<h2>6 · Rubriques d\'un agent','<h2>7 · Rubriques d\'un agent')
 +`<div class="card"><h2>8 · Importer ou exporter les rubriques (Excel / PDF)</h2><div class="sub" style="margin-bottom:10px">Importer : chargez un fichier Excel (une ligne par agent, une colonne par rubrique) ; RHOSPI affiche ses colonnes, reconnaît les rubriques existantes, propose d'ajouter celles qui n'existent pas, et vous choisissez les colonnes à importer. Exporter : choisissez les rubriques, les agents et le format.</div>
 <div class="row">${e?ixBtns('paie'):''}<button class="btn g s" data-act="ixExp">Exporter les rubriques…</button>${e?'<button class="btn g s" data-act="ixModele">Télécharger un modèle Excel</button>':''}</div></div>`)(rubPage);
const agentsIX=PAGES.agents;
PAGES.agents=()=>{const h=agentsIX();return can('agents')?h.replace('<button class="btn g" data-act="expOpen">',`${ixBtns('agents').replace('btn g s','btn g')}<button class="btn g" data-act="ixExp">Exporter les rubriques</button><button class="btn g" data-act="expOpen">`):h};
