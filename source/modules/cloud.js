/* ============ Mode en ligne : Supabase (comptes, synchronisation par différences, cache local) ============ */
let CL=(typeof window!=='undefined'&&window.RH_CLOUD)?{url:window.RH_CLOUD.url,key:window.RH_CLOUD.key,sess:null,org:null,orgs:[],me:null,profil:null,
 last:new Map(),pend:new Map(),cur:null,ready:false,busy:false,pulling:false,err:'',horsLigne:false,refus:0,tPush:null,tCache:null,membres:null,aRendre:false}:null;
const CL_SEUL=['vacations','bareme','pecCat'],CL_MAP=['planning','alertesTraitees','bulletins','paieArretee','paramsSvc','vacSvc','bilanNotes'],
 CL_UNSHIFT=['audit','corrections','journalPaie'],CL_AJOUT=['audit','corrections','journalPaie'],CL_SEP='\u0001',CL_LOT=400,CL_PAGE=5000;
const CL_GESTION=['superadmin','directeur','rh'],CL_AVEC_AGENT=['chef','major','agent'];

/* --- Découpage des données en enregistrements : une ligne par agent, pointage, case de planning… --- */
function clForme(db){const f={};for(const k of Object.keys(db)){const v=db[k];
 f[k]=Array.isArray(v)&&!CL_SEUL.includes(k)&&v.every(x=>x&&typeof x==='object'&&!Array.isArray(x))?'a':CL_MAP.includes(k)&&v&&typeof v==='object'&&!Array.isArray(v)?'m':'k'}return f}
function clRows(db){const m=new Map(),f=clForme(db);
 for(const k of Object.keys(db)){const v=db[k];
  if(f[k]==='a'){for(const x of v){if(x.id==null||x.id==='')x.id=uid();m.set('a:'+k+CL_SEP+x.id,JSON.stringify(x))}}
  else if(f[k]==='m'){for(const i in v)m.set('m:'+k+CL_SEP+i,JSON.stringify(v[i]===undefined?null:v[i]))}
  else m.set('k:'+k+CL_SEP+'_',JSON.stringify(v===undefined?null:v))}
 if(Object.keys(db).length)m.set('k:__forme'+CL_SEP+'_',JSON.stringify(f));
 return m}

/* --- Accès au serveur --- */
async function clAuth(body,grant){
 const r=await fetch(CL.url+'/auth/v1/token?grant_type='+grant,{method:'POST',headers:{apikey:CL.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok){const e=new Error(/invalid/i.test(j.error_description||j.msg||j.error_code||'')?'Adresse e-mail ou mot de passe incorrect.':(j.error_description||j.msg||'Connexion refusée.'));e.status=r.status;e.auth=true;throw e}
 CL.sess={at:j.access_token,rt:j.refresh_token,exp:Date.now()+((j.expires_in||3600)-120)*1000,uid:j.user.id,email:j.user.email};lsSet('rhospi.sess',JSON.stringify(CL.sess));return CL.sess}
let CL_REF=null;
async function clTok(){if(!CL.sess){const e=new Error('Non connecté.');e.status=401;e.auth=true;throw e}
 if(Date.now()>CL.sess.exp){if(!CL_REF)CL_REF=clAuth({refresh_token:CL.sess.rt},'refresh_token').finally(()=>{CL_REF=null});await CL_REF}return CL.sess.at}
async function clApi(path,o={}){const at=await clTok(),h={apikey:CL.key,Authorization:'Bearer '+at,...(o.headers||{})};let body=o.body;
 if(body!==undefined&&!(typeof Blob!=='undefined'&&body instanceof Blob)){h['Content-Type']='application/json';body=JSON.stringify(body)}
 let r;try{r=await fetch(CL.url+path,{method:o.method||'GET',headers:h,body})}catch(e){const x=new Error('Pas de connexion au serveur.');x.reseau=true;throw x}
 if(o.raw){if(!r.ok){const x=new Error('Erreur '+r.status);x.status=r.status;throw x}return r}
 const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
 if(!r.ok){const e=new Error((j&&(j.message||j.error||j.msg))||('Erreur '+r.status));e.status=r.status;e.code=j&&j.code;if(r.status===401)e.auth=true;throw e}return j}
const clRpc=(f,a)=>clApi('/rest/v1/rpc/'+f,{method:'POST',body:a});
const clFn=(action,a={})=>clApi('/functions/v1/rh-admin',{method:'POST',body:{org:CL.org,action,...a}});

/* --- Cache local (IndexedDB) : démarrage immédiat, seules les différences sont téléchargées --- */
let CL_IDB=null;
const clIdb=()=>CL_IDB||(CL_IDB=new Promise((ok,ko)=>{try{const r=indexedDB.open('rhospi',1);r.onupgradeneeded=()=>r.result.createObjectStore('cache');r.onsuccess=()=>ok(r.result);r.onerror=()=>ko(r.error)}catch(e){ko(e)}}));
const clIdbDo=(m,f)=>clIdb().then(d=>new Promise((ok,ko)=>{const t=d.transaction('cache',m),q=f(t.objectStore('cache'));t.oncomplete=()=>ok(q.result);t.onerror=()=>ko(t.error)}));
const clCleCache=()=>CL.sess.uid+'|'+CL.org;
async function clCacheLire(){try{return await clIdbDo('readonly',x=>x.get(clCleCache()))}catch(e){return null}}
function clCache(){clearTimeout(CL.tCache);CL.tCache=setTimeout(clCacheMaintenant,1500)}
function clCacheMaintenant(){clearTimeout(CL.tCache);if(!CL.ready||!CL.sess)return Promise.resolve();
 try{return clIdbDo('readwrite',x=>x.put({db:DB,cur:CL.cur,pend:[...CL.pend.entries()],t:Date.now()},clCleCache())).catch(()=>{})}catch(e){return Promise.resolve()}}

/* --- Envoi : seuls les enregistrements modifiés partent, par lots --- */
function clDiff(){if(!CL.ready)return;const now=clRows(DB);
 for(const[k,j]of now)if(CL.last.get(k)!==j){CL.pend.set(k,j);CL.last.set(k,j)}
 for(const k of[...CL.last.keys()])if(!now.has(k)){CL.last.delete(k);const c=k.slice(2,k.indexOf(CL_SEP));if(k[0]==='a'&&CL_AJOUT.includes(c))continue;CL.pend.set(k,null)}}
function clPlanifier(){if(!CL.ready)return;clearTimeout(CL.tPush);CL.tPush=setTimeout(()=>{clDiff();clEtat();clCache();clPush()},700)}
const clLigne=([k,j])=>{const i=k.indexOf(CL_SEP),c=k.slice(0,i),id=k.slice(i+1);return j===null?[c,id,null,true]:[c,id,JSON.parse(j),false]};
async function clPush(){if(CL.busy||!CL.pend.size||!CL.ready)return;CL.busy=true;clEtat();let encore=false;
 try{const all=[...CL.pend.entries()];
  for(let i=0;i<all.length;i+=CL_LOT){const lot=all.slice(i,i+CL_LOT);
   try{await clRpc('rh_push',{p_org:CL.org,p_rows:lot.map(clLigne)})}
   catch(e){if(e.code!=='42501')throw e; // un enregistrement non autorisé : on envoie un par un pour garder les autres
    for(const x of lot){try{await clRpc('rh_push',{p_org:CL.org,p_rows:[clLigne(x)]})}catch(e2){if(e2.code!=='42501')throw e2;CL.refus++}}}
   for(const[k,j]of lot)if(CL.pend.get(k)===j)CL.pend.delete(k)}
  CL.err='';CL.horsLigne=false;encore=CL.pend.size>0}
 catch(e){CL.horsLigne=!!e.reseau;CL.err=e.reseau?'':e.message;if(e.auth)clSessionPerdue()}
 finally{CL.busy=false;clEtat();clCache()}
 if(encore)setTimeout(clPush,50)}

/* --- Réception : seules les modifications depuis le dernier passage sont lues --- */
function clLot(rows){let n=0;const parA=new Map();
 for(const[coll,id,data,del]of rows){const key=coll+CL_SEP+id;if(CL.pend.has(key))continue;
  const j=del?null:JSON.stringify(data);if(del?!CL.last.has(key):CL.last.get(key)===j)continue;n++;
  if(del)CL.last.delete(key);else CL.last.set(key,j);
  const t=coll[0],k=coll.slice(2);
  if(t==='a'){if(!parA.has(k))parA.set(k,new Map());parA.get(k).set(id,[data,del])}
  else if(t==='m'){const o=DB[k]&&typeof DB[k]==='object'&&!Array.isArray(DB[k])?DB[k]:(DB[k]={});if(del)delete o[id];else o[id]=data}
  else if(k==='__forme'){if(!del&&data)for(const[x,f]of Object.entries(data)){if(f==='a'&&!Array.isArray(DB[x]))DB[x]=[];if(f==='m'&&(!DB[x]||typeof DB[x]!=='object'))DB[x]={}}}
  else if(del)delete DB[k];else DB[k]=(/^seq/.test(k)&&typeof DB[k]==='number'&&typeof data==='number')?Math.max(DB[k],data):data}
 for(const[k,l]of parA){let a=Array.isArray(DB[k])?DB[k]:[];const ix=new Map();a.forEach((x,i)=>ix.set(String(x.id),i));const nv=[],sup=new Set();
  for(const[id,[data,del]]of l){const i=ix.get(id);if(del){if(i!==undefined)sup.add(i)}else if(i!==undefined)a[i]=data;else nv.push(data)}
  if(sup.size)a=a.filter((_,i)=>!sup.has(i));
  if(nv.length)a=CL_UNSHIFT.includes(k)?nv.reverse().concat(a):a.concat(nv);
  if(k==='audit'&&a.length>500)a.length=500;DB[k]=a}
 return n}
async function clPull(prog){if(CL.pulling)return 0;CL.pulling=true;let n=0;
 try{let c=CL.cur?{maj:new Date(new Date(CL.cur.maj).getTime()-15000).toISOString(),coll:'',id:''}:{maj:'-infinity',coll:'',id:''};
  for(let tour=0;tour<500;tour++){const r=await clRpc('rh_pull',{p_org:CL.org,p_maj:c.maj,p_coll:c.coll,p_id:c.id,p_lim:CL_PAGE});
   n+=clLot(r.rows);
   if(r.rows.length){const l=r.rows[r.rows.length-1];c={maj:l[4],coll:l[0],id:l[1]};if(!CL.cur||new Date(l[4])>new Date(CL.cur.maj))CL.cur={maj:l[4]}}
   if(prog)prog(n);if(r.rows.length<CL_PAGE)break}
  CL.horsLigne=false;if(!CL.pend.size)CL.err=''}
 catch(e){CL.horsLigne=!!e.reseau;if(!e.reseau)CL.err=e.message;if(e.auth)clSessionPerdue();if(!CL.ready)throw e}
 finally{CL.pulling=false}
 if(n&&CL.ready){index();clCache();clRafraichir()}else if(CL.ready)clEtat();
 return n}
function clRafraichir(){const a=typeof document!=='undefined'&&document.activeElement,saisie=a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.id!=='profil';
 if($('#layer').innerHTML||$('#layer2').innerHTML||saisie){CL.aRendre=true;return clEtat()}CL.aRendre=false;render()}

/* --- État de la synchronisation, affiché dans la barre latérale --- */
function clEtatTexte(){if(CL.err)return['crit','Erreur : '+CL.err];if(CL.horsLigne)return['warn',`Hors ligne${CL.pend.size?` — ${CL.pend.size} modification(s) en attente`:''}`];
 if(CL.busy||CL.pend.size)return['info',`Enregistrement… (${CL.pend.size})`];return['ok','Synchronisé']}
function clEtat(){const e=typeof document!=='undefined'&&document.getElementById('cl_etat');if(!e)return;const[c,t]=clEtatTexte();e.className='cl-etat '+c;e.textContent=t}
function clWho(){const w=$('#side .who');if(!w||!CL.profil)return;
 w.innerHTML=`<span>${esc(CL.profil.nom)}</span><span style="opacity:.8">${esc(ROLES[CL.profil.role].nom)}${CL.profil.agentId&&ag(CL.profil.agentId)?' — '+esc(nomA(ag(CL.profil.agentId))):''}</span>
 ${CL.orgs.length>1?`<select data-chg="clOrg" aria-label="Organisation">${opt(CL.orgs,CL.org,o=>[o.id,o.nom])}</select>`:''}
 <span id="cl_etat" class="cl-etat"></span><button class="btn g s" data-act="clLogout" style="background:transparent;color:#fff;border-color:#2c5788">Se déconnecter</button>`;clEtat()}

/* --- Écrans de connexion et de démarrage --- */
function clEcran(html){$('#layer').innerHTML=`<div class="cl-ecran"><div class="card cl-box"><div class="brand" style="margin-bottom:14px"><div class="logo"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4L19 7"/></svg></div><div><b style="color:var(--bleu-fonce)">SENHOP RH</b><div class="sub">Gestion des ressources humaines</div></div></div>${html}</div></div>`}
function clLoginEcran(msg='',email){CL.ready=false;clEcran(`<h2 style="margin-bottom:12px">Connexion</h2>${msg?`<div class="demo" style="margin-bottom:12px">${esc(msg)}</div>`:''}
 <form id="cl_form" style="display:flex;flex-direction:column;gap:12px"><label class="field">Adresse e-mail<input id="cl_email" type="email" autocomplete="username" required value="${esc(email||lsGet('rhospi.email')||'')}"></label>
 <label class="field">Mot de passe<input id="cl_mdp" type="password" autocomplete="current-password" required></label><button class="btn" type="submit" id="cl_ok">Se connecter</button>
 <div class="sub">Les comptes sont créés par la direction ou le service des ressources humaines.</div></form>`);
 const f=document.getElementById('cl_form');f.addEventListener('submit',async ev=>{ev.preventDefault();const b=document.getElementById('cl_ok');b.disabled=true;b.textContent='Connexion…';
  try{const em=val('cl_email').trim();await clAuth({email:em,password:val('cl_mdp')},'password');lsSet('rhospi.email',em);await clDemarrer()}
  catch(e){clLoginEcran(e.reseau?'Pas de connexion au serveur. Vérifiez la connexion internet.':e.message,val('cl_email').trim())}});
 setTimeout(()=>{const i=document.getElementById(email||lsGet('rhospi.email')?'cl_mdp':'cl_email');if(i)i.focus()},50)}
function clSessionPerdue(){if(!CL.sess)return;CL.sess=null;lsDel('rhospi.sess');clCacheMaintenant();clLoginEcran('Votre session a expiré : reconnectez-vous. Vos modifications en attente sont conservées.')}
async function clDemarrer(){
 clEcran('<h2>Ouverture…</h2><p class="sub" id="cl_prog">Vérification de vos accès.</p>');
 let ms;try{ms=await clApi('/rest/v1/rh_membres?select=org_id,role,agent_id,nom,rh_orgs(nom)&actif=is.true&user_id=eq.'+CL.sess.uid);lsSet('rhospi.acces.'+CL.sess.uid,JSON.stringify(ms))}
 catch(e){if(e.auth){CL.sess=null;lsDel('rhospi.sess');return clLoginEcran('Votre session a expiré : reconnectez-vous.')}if(!e.reseau)throw e;try{ms=JSON.parse(lsGet('rhospi.acces.'+CL.sess.uid)||'null')}catch(x){}if(!ms)return clEcran(`<p>Pas de connexion au serveur.</p><button class="btn" data-act="clRetry">Réessayer</button>`);CL.horsLigne=true}
 if(!ms.length)return clEcran(`<h2>Aucun accès</h2><p>Votre compte (${esc(CL.sess.email)}) n'est rattaché à aucune organisation. Demandez à la direction ou au service des ressources humaines de vous donner un accès.</p><button class="btn g" data-act="clLogout">Se déconnecter</button>`);
 CL.orgs=ms.map(m=>({id:m.org_id,nom:(m.rh_orgs&&m.rh_orgs.nom)||m.org_id,role:m.role,agentId:m.agent_id,nom2:m.nom}));
 const pref=lsGet('rhospi.org'),me=CL.orgs.find(o=>o.id===pref)||CL.orgs[0];CL.org=me.id;CL.me=me;ORG_ACTIVE=me.id;
 const c=await clCacheLire();DB=c&&c.db?c.db:{};CL.cur=c&&c.cur||null;CL.pend=new Map(c&&c.pend||[]);CL.last=clRows(DB);
 const p=document.getElementById('cl_prog');if(p)p.textContent=c?'Mise à jour des données…':'Premier chargement des données…';
 try{await clPull(n=>{const q=document.getElementById('cl_prog');if(q&&n)q.textContent=`${n.toLocaleString('fr-FR')} enregistrement(s) reçu(s)…`})}
 catch(e){if(!e.reseau||!DB.agents)return clEcran(`<p>${esc(e.reseau?'Pas de connexion au serveur.':e.message)}</p><button class="btn" data-act="clRetry">Réessayer</button> <button class="btn g" data-act="clLogout">Se déconnecter</button>`);CL.horsLigne=true}
 if(!DB.agents||!DB.services)return clVide();
 clLancer()}
function clVide(){if(!CL_GESTION.includes(CL.me.role))return clEcran(`<h2>${esc(CL.me.nom)}</h2><p>Cette organisation n'a pas encore de données. La direction ou le service des ressources humaines doit d'abord les installer.</p><button class="btn g" data-act="clLogout">Se déconnecter</button>`);
 clEcran(`<h2 style="margin-bottom:6px">${esc(CL.me.nom)}</h2><p class="sub" style="margin-top:0">Cette organisation est vide. Comment voulez-vous commencer ?</p>
 <div style="display:flex;flex-direction:column;gap:10px"><label class="btn">Importer une sauvegarde (.json)<input type="file" accept=".json,application/json" data-chg="clImportVide" hidden></label>
 <button class="btn g" data-act="clDebut" data-m="vierge">Organisation vierge (services et listes par défaut)</button><button class="btn g" data-act="clDebut" data-m="demo">Données d'exemple</button></div>
 <p class="sub">La sauvegarde se crée dans l'ancienne version, depuis Paramètres › Sauvegarde des données.</p>`)}
function clLancer(){migrate(DB);index();
 const m=CL.me,a=m.agentId&&ag(m.agentId);
 if(CL_AVEC_AGENT.includes(m.role)&&!a)return clEcran(`<p>Votre compte est relié à un agent qui n'existe pas dans « ${esc(m.nom)} ». Demandez au service des ressources humaines de corriger votre accès.</p><button class="btn g" data-act="clLogout">Se déconnecter</button>`);
 CL.profil={id:'moi',role:m.role,agentId:a?a.id:undefined,nom:m.nom2||CL.sess.email,label:ROLES[m.role].nom};
 const premier=!CL.ready;CL.ready=true;$('#layer').innerHTML='';
 if(premier){init();clDemarrerSuivi()}else{S.profil=CL.profil;render()}
 clDiff();clEtat();clCache();clPush()}
let CL_SUIVI=false;
function clDemarrerSuivi(){if(CL_SUIVI)return;CL_SUIVI=true;
 setInterval(()=>{if(CL.ready&&document.visibilityState==='visible')clPull().then(()=>{if(CL.pend.size)clPush()})},15000);
 document.addEventListener('visibilitychange',()=>{if(!CL.ready)return;if(document.visibilityState==='hidden'){clearTimeout(CL.tPush);clDiff();clCacheMaintenant();clPush()}else clPull()});
 window.addEventListener('online',()=>{if(CL.ready){clPush();clPull()}});
 window.addEventListener('beforeunload',e=>{if(!CL.ready)return;clearTimeout(CL.tPush);clDiff();clCacheMaintenant();if(CL.pend.size){clPush();e.preventDefault();e.returnValue=''}});
 document.addEventListener('click',()=>{if(CL.aRendre&&!$('#layer').innerHTML&&!$('#layer2').innerHTML)setTimeout(()=>{if(CL.aRendre&&!$('#layer').innerHTML)clRafraichir()},300)},true)}

/* --- Comptes d'accès (direction, RH) --- */
async function clMembres(){try{CL.membres=await clApi('/rest/v1/rh_membres?select=user_id,role,agent_id,nom,email,actif,cree_le&org_id=eq.'+encodeURIComponent(CL.org)+'&order=nom')}catch(e){CL.membres=[];toast(e.message,'err')}if(S.page==='params')clRafraichir()}
function clRolesPossibles(){return Object.keys(ROLES).filter(r=>r!=='superadmin'||CL.profil.role==='superadmin')}
function clComptesCarte(){if(!CL||!CL.ready||!CL_GESTION.includes(CL.profil.role))return'';if(CL.membres===null){CL.membres=undefined;clMembres()}
 const L=CL.membres||[];
 return`<div class="card"><div class="head" style="margin-bottom:10px"><h2>Comptes d'accès</h2><span class="sp"></span><span class="sub">Chaque personne se connecte avec son adresse e-mail et son mot de passe. Les comptes n'ont pas besoin de confirmation par e-mail.</span></div>
 ${CL.membres===undefined?'<p class="sub">Chargement…</p>':table(['Nom','Adresse e-mail','Profil','Agent relié','État','Actions'],L.map(m=>`<tr><td><b>${esc(m.nom)}</b></td><td>${esc(m.email||'')}</td><td>${esc((ROLES[m.role]||{}).nom||m.role)}</td><td>${m.agent_id&&ag(m.agent_id)?esc(nomA(ag(m.agent_id))):'—'}</td><td>${m.actif?'<span class="pill ok">actif</span>':'<span class="pill mute">désactivé</span>'}</td>
  <td>${m.user_id===CL.sess.uid?'<span class="sub">vous</span>':(m.role==='superadmin'&&CL.profil.role!=='superadmin')?'—':`<div class="row" style="flex-wrap:nowrap"><button class="btn g s" data-act="clCptEdit" data-id="${m.user_id}">Modifier</button><button class="btn g s" data-act="clCptMdp" data-id="${m.user_id}">Mot de passe</button><button class="btn ${m.actif?'r':'v'} s" data-act="clCptActif" data-id="${m.user_id}">${m.actif?'Désactiver':'Réactiver'}</button></div>`}</td></tr>`),'Aucun compte.')}
 <h3 style="margin:16px 0 6px">Nouveau compte</h3><div class="form"><label class="field">Nom et prénom<input id="cc_nom"></label><label class="field">Adresse e-mail<input id="cc_email" type="email" autocomplete="off"></label><label class="field">Mot de passe (8 caractères minimum)<input id="cc_mdp" type="text" autocomplete="new-password"></label>
 <label class="field">Profil<select id="cc_role">${opt(clRolesPossibles(),'agent',r=>[r,ROLES[r].nom])}</select></label><label class="field">Agent relié (obligatoire pour chef, major et agent)${agPick('cc_ag',DB.agents.filter(a=>a.situation!=='sorti des effectifs'),'')}</label><div class="field"><span>&nbsp;</span><button class="btn" data-act="clCptNew">Créer le compte</button></div></div>
 <div class="sub">Communiquez l'adresse et le mot de passe à la personne. Si l'adresse a déjà un compte (dans une autre application), elle garde son mot de passe actuel.</div></div>`}
function clSauvegardeCarte(){if(!['superadmin','directeur','rh'].includes(S.profil.role))return'';
 return`<div class="card"><div class="head" style="margin-bottom:10px"><h2>Sauvegarde des données</h2></div><div class="row"><button class="btn g s" data-act="clExport">Exporter toutes les données (.json)</button>${S.profil.role==='superadmin'?`<label class="btn r s">Restaurer une sauvegarde<input type="file" accept=".json,application/json" data-chg="clImport" hidden></label>`:''}</div>
 <div class="sub" style="margin-top:8px">${CL?'La sauvegarde contient les données de l\'organisation ouverte. La restauration remplace toutes ses données, pour tous les utilisateurs.':'Exportez ce fichier pour transférer vos données vers la version en ligne : connectez-vous, puis choisissez « Importer une sauvegarde ».'} Les pièces jointes (documents, photos) ne sont pas incluses.</div></div>`}
const paramsAvantCloud=PAGES.params;
PAGES.params=()=>{let h=paramsAvantCloud();if(S.pSvc)return h;if(CL)h=h.replace('Organisations gérées sur cet appareil','Organisations auxquelles vous avez accès').replace(/<button class="btn r s" data-act="orgSuppr"[^>]*>Supprimer<\/button>/g,'');return h+clComptesCarte()+clSauvegardeCarte()};

const clLireJson=f=>new Promise((ok,ko)=>{const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||!Array.isArray(d.agents)||!Array.isArray(d.services))throw 0;ok(d)}catch(e){ko(new Error('Ce fichier n\'est pas une sauvegarde SENHOP RH valide.'))}};r.onerror=()=>ko(r.error);r.readAsText(f)});
let CL_IMPORT=null;
Object.assign(CHG,{
 clOrg:el=>{lsSet('rhospi.org',el.value);clCacheMaintenant().then(()=>location.reload())},
 clImport:async el=>{const f=el.files[0];if(!f)return;try{CL_IMPORT=await clLireJson(f)}catch(e){return toast(e.message,'err')}
  modal('Restaurer une sauvegarde',`<p>Remplacer <b>toutes</b> les données de « ${esc(DB.etab)} » par celles du fichier « ${esc(f.name)} » (${CL_IMPORT.agents.length} agent(s), ${(CL_IMPORT.pointages||[]).length} pointage(s)) ?${CL?' Le changement s\'applique à tous les utilisateurs.':''}</p>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn r" data-act="clImportOk">Remplacer les données</button>`)},
 clImportVide:async el=>{const f=el.files[0];if(!f)return;try{DB=await clLireJson(f)}catch(e){return toast(e.message,'err')}DB.etab=DB.etab||CL.me.nom;clLancer();toast('Sauvegarde importée. Envoi des données au serveur…','ok')}
});
Object.assign(ACT,{
 clRetry:()=>clDemarrer().catch(e=>clEcran(`<p>${esc(e.message)}</p><button class="btn" data-act="clRetry">Réessayer</button>`)),
 clLogout:async()=>{if(CL.ready){clearTimeout(CL.tPush);clDiff();if(CL.pend.size){await clPush();if(CL.pend.size&&!confirm(`${CL.pend.size} modification(s) n'ont pas encore été envoyées au serveur. Se déconnecter quand même ? Elles seront perdues.`))return}}
  if(CL.sess){try{await clIdbDo('readwrite',x=>x.delete(clCleCache()))}catch(e){}}try{if(CL.sess)await fetch(CL.url+'/auth/v1/logout',{method:'POST',headers:{apikey:CL.key,Authorization:'Bearer '+CL.sess.at}})}catch(e){}
  lsDel('rhospi.sess');location.reload()},
 clDebut:d=>{DB=d.m==='demo'?seed(new Date()):orgVierge(CL.me.nom);DB.etab=CL.me.nom;clLancer();toast(d.m==='demo'?'Données d\'exemple installées.':'Organisation prête : complétez ses services et ses agents.','ok')},
 clExport:()=>{clRows(DB);telecharger(`SENHOP_RH_sauvegarde_${(DB.etab||'').replace(/[^A-Za-z0-9]+/g,'_')}_${today()}.json`,new Blob([JSON.stringify(DB)],{type:'application/json'}))},
 clImportOk:()=>{if(!CL_IMPORT)return closeModal();DB=CL_IMPORT;CL_IMPORT=null;migrate(DB);save();closeModal();if(typeof S!=='undefined'){S.profil=profils()[0];S.page='params'}render();toast('Données restaurées.','ok')},
 clCptNew:async()=>{const role=val('cc_role'),agentId=pickId('cc_ag'),b={nom:val('cc_nom').trim(),email:val('cc_email').trim(),password:val('cc_mdp'),role,agent_id:agentId||null};
  if(!b.nom||!b.email)return toast('Indiquez le nom et l\'adresse e-mail.','err');if(CL_AVEC_AGENT.includes(role)&&!agentId)return toast('Choisissez l\'agent relié à ce compte.','err');
  try{const r=await clFn('creer',b);if(!r.ok)return toast(r.error,'err');toast(r.existant?`Accès ajouté pour ${b.email} : cette adresse avait déjà un compte, son mot de passe actuel reste valable.`:`Compte créé pour ${b.email}.`,'ok');audit('Compte d\'accès créé',`${b.nom} — ${ROLES[role].nom}`);save();clMembres()}catch(e){toast(e.message,'err')}},
 clCptEdit:d=>{const m=(CL.membres||[]).find(x=>x.user_id===d.id);if(!m)return;
  modal(`Modifier l'accès — ${m.nom}`,`<div class="form"><label class="field">Nom et prénom<input id="ce_nom" value="${esc(m.nom)}"></label><label class="field">Profil<select id="ce_role">${opt(clRolesPossibles(),m.role,r=>[r,ROLES[r].nom])}</select></label><label class="field">Agent relié${agPick('ce_ag',DB.agents,m.agent_id||'')}</label></div>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn" data-act="clCptEditOk" data-id="${m.user_id}">Enregistrer</button>`)},
 clCptEditOk:async d=>{const role=val('ce_role'),agentId=pickId('ce_ag');if(CL_AVEC_AGENT.includes(role)&&!agentId)return toast('Choisissez l\'agent relié à ce compte.','err');
  try{const r=await clFn('modifier',{user_id:d.id,nom:val('ce_nom').trim(),role,agent_id:agentId||null});if(!r.ok)return toast(r.error,'err');closeModal();toast('Accès modifié.','ok');clMembres()}catch(e){toast(e.message,'err')}},
 clCptMdp:d=>{const m=(CL.membres||[]).find(x=>x.user_id===d.id);modal(`Nouveau mot de passe — ${m.nom}`,`<label class="field">Mot de passe (8 caractères minimum)<input id="cm_mdp" type="text" autocomplete="new-password"></label>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn" data-act="clCptMdpOk" data-id="${d.id}">Enregistrer</button>`)},
 clCptMdpOk:async d=>{try{const r=await clFn('motdepasse',{user_id:d.id,password:val('cm_mdp')});if(!r.ok)return toast(r.error,'err');closeModal();toast('Mot de passe modifié.','ok')}catch(e){toast(e.message,'err')}},
 clCptActif:async d=>{const m=(CL.membres||[]).find(x=>x.user_id===d.id);try{const r=await clFn('modifier',{user_id:d.id,actif:!m.actif});if(!r.ok)return toast(r.error,'err');toast(m.actif?'Accès désactivé.':'Accès réactivé.','ok');clMembres()}catch(e){toast(e.message,'err')}}
});

/* --- Branchement sur l'application quand le mode en ligne est actif --- */
if(CL){
 save=function(){index();clPlanifier()};
 load=function(){if(!DB||!DB.agents)DB=seed(new Date());migrate(DB);index()};
 profils=function(){return[CL.profil]};
 orgsListe=function(){return CL.orgs.map(o=>({id:o.id,nom:o.nom}))};
 orgSync=function(){};
 const renderSansCloud=render;render=function(){renderSansCloud();clWho()};
 Object.assign(ACT,{
  orgOuvrir:d=>{lsSet('rhospi.org',d.id);clCacheMaintenant().then(()=>location.reload())},
  orgNew:async()=>{const nom=val('org_new').trim();if(!nom)return toast('Indiquez le nom de la nouvelle organisation.','err');
   try{const id=await clRpc('rh_org_creer',{p_nom:nom});audit('Organisation créée',nom);save();lsSet('rhospi.org',id);await clCacheMaintenant();location.reload()}catch(e){toast(e.message,'err')}},
  orgSuppr:()=>toast('La suppression d\'une organisation en ligne n\'est pas proposée dans l\'application.','err'),
  resetAsk:()=>toast('Le rechargement des données d\'exemple n\'est pas disponible en ligne.','err')});
 filePut=(id,b)=>clApi(`/storage/v1/object/rh-fichiers/${encodeURIComponent(CL.org)}/${encodeURIComponent(id)}`,{method:'POST',body:b,headers:{'x-upsert':'true','Content-Type':b.type||'application/octet-stream'}});
 fileGet=async id=>{const r=await clApi(`/storage/v1/object/authenticated/rh-fichiers/${encodeURIComponent(CL.org)}/${encodeURIComponent(id)}`,{raw:true});return await r.blob()};
 fileDel=id=>clApi(`/storage/v1/object/rh-fichiers/${encodeURIComponent(CL.org)}/${encodeURIComponent(id)}`,{method:'DELETE'}).catch(()=>{});
}
function clBoot(){try{CL.sess=JSON.parse(lsGet('rhospi.sess')||'null')}catch(e){}if(!CL.sess)return clLoginEcran();
 clDemarrer().catch(e=>{if(e.auth){CL.sess=null;lsDel('rhospi.sess');return clLoginEcran('Votre session a expiré : reconnectez-vous.')}clEcran(`<p>${esc(e.message)}</p><button class="btn" data-act="clRetry">Réessayer</button> <button class="btn g" data-act="clLogout">Se déconnecter</button>`)})}
