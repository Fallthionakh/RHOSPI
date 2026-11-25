/* ============ Messagerie pour tous : réception, envoi (agents, services, postes, responsables), pièces jointes ============ */
Object.keys(ROLES).forEach(r=>{const m=ROLES[r].menu;if(!m.includes('messages'))m.splice(Math.min(1,m.length),0,'messages')});
const migrateMS=migrate;
migrate=function(db){migrateMS(db);db.messages=db.messages||[];db.msgLus=db.msgLus||[];return db};
SV_IGN.add('msgLus');
const MSG_ROLES=[['r:rh','Service des ressources humaines'],['r:directeur','Direction'],['r:saf','Service administratif et financier'],['r:superadmin','Administrateur de l\'application'],['r:chef','Tous les chefs de service'],['r:major','Tous les majors']];
function maCle(){return S.profil.agentId?'a:'+S.profil.agentId:'u:'+((typeof CL!=='undefined'&&CL&&CL.sess&&(CL.sess.uid||(CL.sess.user&&CL.sess.user.id)))||S.profil.id||S.profil.role)}
function mesCles(){const s=new Set([maCle(),'r:'+S.profil.role,'*']),a=S.profil.agentId&&ag(S.profil.agentId);if(a){s.add('s:'+a.serviceId);if(a.fonctionId)s.add('f:'+a.fonctionId);s.add('r:agent')}return s}
const msgNotif=m=>!m.cles;
function msgRecus(){const C=mesCles(),me=maCle(),id=S.profil.agentId;return(DB.messages||[]).filter(m=>msgNotif(m)?(id&&m.agentId===id):m.deCle!==me&&(m.cles||[]).some(k=>C.has(k))).sort((x,y)=>String(y.t).localeCompare(String(x.t)))}
const msgEnvoyes=()=>(DB.messages||[]).filter(m=>!msgNotif(m)&&m.deCle===maCle()).sort((x,y)=>String(y.t).localeCompare(String(x.t)));
function msgLuSet(){const me=maCle();return new Set((DB.msgLus||[]).filter(x=>x.cle===me).map(x=>x.msgId))}
const msgEstLu=(m,L)=>msgNotif(m)?!!m.lu:(L||msgLuSet()).has(m.id);
msgN=()=>{const L=msgLuSet();return msgRecus().filter(m=>!msgEstLu(m,L)).length};
function msgMarquer(m){if(msgEstLu(m))return;if(msgNotif(m)){m.lu=true;m.luLe=new Date().toISOString()}else(DB.msgLus=DB.msgLus||[]).push({id:m.id+'|'+maCle(),msgId:m.id,cle:maCle(),agentId:S.profil.agentId||undefined,t:new Date().toISOString()})}
const msgDestLib=m=>(m.dest||[]).map(d=>d.lib).join(', ');

/* ---------- Écran Messages ---------- */
PAGES.messages=()=>{const F=S.msgF=S.msgF||'recus',L=msgLuSet(),rec=msgRecus(),nl=rec.filter(m=>!msgEstLu(m,L)),env=msgEnvoyes(),q=kNorm(S.msgQ||'');
 let l=F==='env'?env:F==='nonlus'?nl:rec;if(q)l=l.filter(m=>kNorm(`${m.de||''} ${m.objet||m.titre||''} ${m.texte||''} ${msgDestLib(m)}`).includes(q));
 const tab=(k,lb,n)=>`<button class="btn ${F===k?'':'g'}" data-act="msgF" data-f="${k}">${lb}${n!=null?` <span class="pill ${k==='nonlus'&&n?'crit':'info'}" style="margin-left:4px">${n}</span>`:''}</button>`;
 return`<div class="head"><div><h1>Messages</h1><div class="sub">${nl.length?`${nl.length} message(s) non lu(s) sur ${rec.length} reçu(s)`:`${rec.length} message(s) reçu(s), tous lus`}</div></div><span class="sp"></span>${nl.length?'<button class="btn g" data-act="msgTousLus">Tout marquer comme lu</button>':''}<button class="btn" data-act="msgNouveau">✎ Nouveau message</button></div>
 <div class="row" style="gap:8px">${tab('recus','Reçus',rec.length)}${tab('nonlus','Non lus',nl.length)}${tab('env','Envoyés',env.length)}<span class="sp"></span><input type="search" id="msg_q" placeholder="Rechercher : expéditeur, objet, texte…" value="${esc(S.msgQ||'')}" data-chg="msgQ" style="min-width:260px" aria-label="Rechercher dans les messages"></div>
 <div class="card" style="padding:8px">${l.length?l.map(m=>msgItem(m,F==='env',L)).join(''):`<div class="empty">${F==='nonlus'?'Aucun message non lu.':F==='env'?'Aucun message envoyé.':'Aucun message reçu.'}</div>`}</div>`};
function msgItem(m,env,L){const lu=env||msgEstLu(m,L),ob=m.objet||m.titre||'(sans objet)',tx=m.texte||'',pj=(m.pj||[]).length;
 return`<div class="msg${lu?'':' nonlu'}" data-act="msgLire" data-id="${m.id}" role="button" tabindex="0"><span class="pt"></span><div style="flex:1;min-width:0"><div class="row" style="gap:8px;flex-wrap:nowrap"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(env?'À : '+msgDestLib(m):msgNotif(m)?'SENHOP RH (automatique)':m.de)}</b><span class="sp"></span>${pj?`<span class="sub" title="${pj} pièce(s) jointe(s)">📎 ${pj}</span>`:''}<span class="sub" style="white-space:nowrap">${fdt(m.t)}</span></div>
 <div style="font-weight:${lu?500:700}">${esc(ob)}</div>${tx?`<div class="sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(tx.slice(0,160))}</div>`:''}</div></div>`}

/* ---------- Lecture ---------- */
ACT.msgLire=d=>{const m=DB.messages.find(x=>x.id===d.id);if(!m)return;const env=m.deCle===maCle()&&!msgNotif(m);if(!env&&!msgEstLu(m)){msgMarquer(m);save()}
 if(msgNotif(m)){S.page=m.page||'moi';if(m.page==='moi')S.moiT=m.tab||'accueil';return render()}
 modal(esc(m.objet||'(sans objet)'),`<div class="sub">De <b>${esc(m.de)}</b> · ${fdt(m.t)}</div><div class="sub">À : ${esc(msgDestLib(m))}</div>
 <div style="white-space:pre-wrap;border-top:1px solid var(--bord);padding-top:12px">${esc(m.texte||'')}</div>
 ${(m.pj||[]).length?`<div><b>Pièces jointes</b><div class="row" style="margin-top:6px">${m.pj.map(p=>`<button class="btn g s" data-act="msgPj" data-m="${m.id}" data-id="${esc(p.id)}">📎 ${esc(p.nom)} <span class="sub">${Math.max(1,Math.round((p.taille||0)/1024))} Ko</span></button>`).join('')}</div></div>`:''}`,
 `<button class="btn g" data-act="close">Fermer</button>${env?'':`<button class="btn" data-act="msgRepondre" data-id="${m.id}">↩ Répondre</button>`}`);render()};
ACT.msgPj=async d=>{const m=DB.messages.find(x=>x.id===d.m),p=(m.pj||[]).find(x=>x.id===d.id);let b;try{b=await fileGet(p.id)}catch(e){}if(!b)return toast('La pièce jointe n\'est pas disponible (pas de connexion, ou fichier envoyé depuis un autre poste en mode hors ligne).','err');await telecharger(p.nom,b)};
ACT.msgRepondre=d=>{const m=DB.messages.find(x=>x.id===d.id);closeModal();msgComposer({dest:[{k:m.deCle,lib:m.de}],objet:/^RE ?:/i.test(m.objet||'')?m.objet:'RE : '+(m.objet||''),texte:`\n\n— Le ${fdt(m.t)}, ${m.de} a écrit :\n${m.texte||''}`})};
ACT.msgF=d=>{S.msgF=d.f;render()};ACT.msgVoir=d=>{S.msgF=d.f||'recus';S.page='messages';render()};
ACT.msgTousLus=()=>{const L=msgLuSet();msgRecus().filter(m=>!msgEstLu(m,L)).forEach(msgMarquer);save();render()};
CHG.msgQ=el=>{S.msgQ=el.value;render();const i=document.getElementById('msg_q');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}};

/* ---------- Rédaction ---------- */
ACT.msgNouveau=()=>msgComposer({dest:[],objet:'',texte:''});
function msgAgentsChoix(){const me=S.profil.agentId&&ag(S.profil.agentId);if(S.profil.role==='agent'&&typeof CL!=='undefined'&&CL&&me)return agCollegues(me).filter(x=>x.id!==me.id);const T=today();return DB.agents.filter(a=>enPoste(a,T)&&a.id!==S.profil.agentId).map(a=>({id:a.id,prenom:a.prenom,nom:a.nom,posteNom:fnom(a),svc:svc(a.serviceId).nom}))}
function msgComposer(o){S.cmp={dest:o.dest||[],t:'ag',q:''};modal('Nouveau message',`<div class="field"><span>Destinataires</span><div id="cmp_dest" class="cmpd"></div></div>
 <div class="row cmpt">${[['ag','Agents'],['sv','Services'],['po','Postes'],['re','Responsables'],...(S.profil.role!=='agent'?[['to','Tout le personnel']]:[])].map(([k,l])=>`<button type="button" class="btn ${k==='ag'?'':'g'} s" data-act="cmpT" data-t="${k}">${l}</button>`).join('')}</div><div id="cmp_choix" class="cmpc"></div>
 <label class="field">Objet<input id="cmp_obj" maxlength="150" value="${esc(o.objet||'')}"></label><label class="field">Message<textarea id="cmp_txt" rows="7">${esc(o.texte||'')}</textarea></label>
 <label class="field">Pièces jointes (tous formats, 25 Mo au plus chacune)<input type="file" id="cmp_pj" multiple></label>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn" data-act="cmpEnvoyer">Envoyer</button>`);
 const dg=document.querySelector('#layer [role=dialog]');if(dg)dg.style.maxWidth='820px';cmpMaj()}
function cmpNb(){const T=today(),ks=new Set(S.cmp.dest.map(d=>d.k));if(ks.has('*'))return DB.agents.filter(a=>enPoste(a,T)).length;
 return DB.agents.filter(a=>enPoste(a,T)&&(ks.has('a:'+a.id)||ks.has('s:'+a.serviceId)||ks.has('f:'+a.fonctionId))).length}
function cmpMaj(){const d=document.getElementById('cmp_dest'),c=document.getElementById('cmp_choix');if(!d||!c)return;const C=S.cmp,has=k=>C.dest.some(x=>x.k===k);
 d.innerHTML=C.dest.length?C.dest.map(x=>`<span class="cmpchip">${esc(x.lib)}<button type="button" data-act="cmpRet" data-k="${esc(x.k)}" aria-label="Retirer ${esc(x.lib)}">×</button></span>`).join('')+`<span class="sub">≈ ${cmpNb()} agent(s)${C.dest.some(x=>x.k.startsWith('r:')||x.k.startsWith('u:'))?' + responsables':''}</span>`:'<span class="sub">Aucun destinataire : choisissez ci-dessous.</span>';
 document.querySelectorAll('.cmpt [data-act=cmpT]').forEach(b=>b.className='btn '+(b.dataset.t===C.t?'':'g')+' s');
 const it=(k,lib,sub='')=>`<button type="button" class="cmpi${has(k)?' on':''}" data-act="cmpAdd" data-k="${esc(k)}" data-l="${esc(lib)}"><b>${esc(lib)}</b>${sub?`<small>${esc(sub)}</small>`:''}<i>${has(k)?'✓':'+'}</i></button>`;
 if(C.t==='ag'){const q=kNorm(C.q||''),l=msgAgentsChoix().filter(a=>!q||kNorm(`${a.prenom} ${a.nom} ${a.id} ${a.posteNom||''} ${a.svc||''}`).includes(q)).slice(0,60);
  c.innerHTML=`<input type="search" id="cmp_q" placeholder="Nom, matricule, poste, service…" value="${esc(C.q||'')}" style="width:100%;margin-bottom:6px" aria-label="Rechercher un agent"><div class="cmpg">${l.map(a=>it('a:'+a.id,`${a.prenom} ${a.nom}`,[a.posteNom,a.svc].filter(Boolean).join(' · '))).join('')||'<div class="sub">Aucun agent trouvé.</div>'}</div>`;
  const i=document.getElementById('cmp_q');if(i){i.oninput=()=>{C.q=i.value;cmpMaj();const j=document.getElementById('cmp_q');j.focus();j.setSelectionRange(j.value.length,j.value.length)}}}
 else if(C.t==='sv')c.innerHTML=`<div class="cmpg">${DB.services.filter(s=>s.actif!==false).map(s=>it('s:'+s.id,s.nom,`tous les agents du service`)).join('')}</div>`;
 else if(C.t==='po')c.innerHTML=`<div class="cmpg">${DB.fonctions.map(f=>it('f:'+f.id,f.nom,'tous les agents à ce poste')).join('')}</div>`;
 else if(C.t==='re')c.innerHTML=`<div class="cmpg">${MSG_ROLES.map(([k,l])=>it(k,l)).join('')}</div>`;
 else c.innerHTML=`<div class="cmpg">${it('*','Tout le personnel','tous les agents et responsables')}</div>`}
Object.assign(ACT,{cmpT:d=>{S.cmp.t=d.t;cmpMaj()},cmpAdd:d=>{const C=S.cmp,i=C.dest.findIndex(x=>x.k===d.k);if(i>=0)C.dest.splice(i,1);else C.dest.push({k:d.k,lib:d.l});cmpMaj()},cmpRet:d=>{S.cmp.dest=S.cmp.dest.filter(x=>x.k!==d.k);cmpMaj()},
 cmpEnvoyer:async()=>{const C=S.cmp,obj=val('cmp_obj').trim(),txt=val('cmp_txt').trim(),fs=[...(document.getElementById('cmp_pj')||{files:[]}).files];
  if(!C.dest.length)return toast('Choisissez au moins un destinataire.','err');if(!obj)return toast('Indiquez l\'objet du message.','err');if(!txt&&!fs.length)return toast('Écrivez votre message ou joignez un document.','err');
  const gros=fs.find(f=>f.size>26214400);if(gros)return toast(`« ${gros.name} » dépasse 25 Mo.`,'err');
  const pj=[],pre=S.profil.role==='agent'&&S.profil.agentId?S.profil.agentId+'_':'';
  for(const f of fs){const id=pre+'M'+uid();try{await filePut(id,f)}catch(e){return toast(`La pièce jointe « ${f.name} » n'a pas pu être envoyée${e&&e.message?' ('+e.message+')':''}.`,'err')}pj.push({id,nom:f.name,taille:f.size,mime:f.type||''})}
  const m={id:'M'+uid(),t:new Date().toISOString(),de:who(),deCle:maCle(),objet:obj,texte:txt,pj,dest:C.dest.map(x=>({k:x.k,lib:x.lib})),cles:C.dest.map(x=>x.k)};
  if(S.profil.agentId)m.deAgent=S.profil.agentId;(DB.messages=DB.messages||[]).unshift(m);save();closeModal();S.msgF='env';S.page='messages';toast('Message envoyé.','ok');render()}});


if(typeof BN_PRIO!=='undefined'&&!BN_PRIO.includes('messages'))BN_PRIO.splice(1,0,'messages');
/* ---------- Tableau de bord et Mon espace : pastilles ---------- */
function msgCarte(){const L=msgLuSet(),r=msgRecus(),n=r.filter(m=>!msgEstLu(m,L)).length,der=r.find(m=>!msgEstLu(m,L));
 return`<div class="card msgcard"><div class="row" style="gap:12px"><div class="msgic">✉</div><div style="flex:1;min-width:200px"><b>Messages</b><div class="sub">${der?`Dernier non lu : ${esc(der.objet||der.titre||'')} — ${esc(msgNotif(der)?'SENHOP RH':der.de)}`:'Aucun message non lu.'}</div></div>
 <button class="pastille ${n?'rouge':''}" data-act="msgVoir" data-f="nonlus" title="Ouvrir les messages non lus"><b>${n}</b> non lu${n>1?'s':''}</button><button class="pastille" data-act="msgVoir" data-f="recus" title="Ouvrir les messages reçus"><b>${r.length}</b> reçu${r.length>1?'s':''}</button><button class="btn g s" data-act="msgNouveau">✎ Écrire</button></div></div>`}
const dashMS=PAGES.dashboard;PAGES.dashboard=()=>{const h=dashMS(),i=h.indexOf('</div>',h.indexOf('<div class="head"'));if(i<0)return msgCarte()+h;const j=h.indexOf('<div class="grid kpis">');const at=j>0?j:h.indexOf('<div class="card"');return at>0?h.slice(0,at)+msgCarte()+h.slice(at):h+msgCarte()};
const moiMS=PAGES.moi;PAGES.moi=()=>{const h=moiMS();if((S.moiT||'accueil')!=='accueil')return h;const i=h.indexOf('<div class="tuiles">');return i<0?h:h.slice(0,i)+msgCarte()+h.slice(i)};
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`
.msgcard{padding:12px 16px}.msgic{width:42px;height:42px;border-radius:12px;background:var(--bleu-pale);color:var(--bleu);display:grid;place-items:center;font-size:20px}
.pastille{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--bord);background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-weight:600;cursor:pointer;color:var(--encre)}.pastille b{font-size:16px}
.pastille.rouge{background:#fdecec;border-color:#f5c2c2;color:#b42318}.pastille.rouge b{background:#ef4444;color:#fff;border-radius:999px;padding:0 8px;font-size:14px}.pastille:hover{box-shadow:0 2px 10px rgba(15,35,70,.12)}
.cmpd{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:42px;padding:6px 8px;border:1px solid var(--bord);border-radius:10px;background:#fbfcfe}
.cmpchip{display:inline-flex;align-items:center;gap:4px;background:var(--bleu-pale);color:var(--bleu-fonce);border-radius:999px;padding:3px 4px 3px 10px;font-weight:600;font-size:13px}.cmpchip button{border:0;background:transparent;cursor:pointer;font-size:16px;line-height:1;color:inherit;padding:0 6px}
.cmpc{max-height:260px;overflow:auto;border:1px solid var(--bord);border-radius:10px;padding:8px}.cmpg{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}
.cmpi{display:flex;flex-direction:column;align-items:flex-start;gap:1px;position:relative;text-align:left;border:1px solid var(--bord);border-radius:10px;background:#fff;padding:7px 30px 7px 10px;cursor:pointer;font:inherit}.cmpi small{color:var(--gris);font-size:11.5px}.cmpi i{position:absolute;right:9px;top:8px;font-style:normal;font-weight:800;color:var(--bleu)}
.cmpi.on{border-color:var(--bleu);background:var(--bleu-pale)}.cmpi:hover{border-color:var(--bleu)}`;document.head&&document.head.appendChild(st)}
