/* ============ Messages : vue « Discussions » en bulles (envoyés à gauche, reçus en bleu à droite) ============ */
const filDe=m=>msgNotif(m)?'notif':(m.fil||m.id);
function fils(){const me=maCle(),L=msgLuSet(),T=new Map();
 [...msgRecus(),...msgEnvoyes()].forEach(m=>{const k=filDe(m);if(!T.has(k))T.set(k,[]);T.get(k).push(m)});
 return[...T.entries()].map(([k,ms])=>{ms.sort((a,b)=>String(a.t).localeCompare(String(b.t)));const o=ms[0],der=ms[ms.length-1],nl=ms.filter(m=>m.deCle!==me&&!msgEstLu(m,L)).length;
  const titre=k==='notif'?'SENHOP RH (automatique)':o.deCle===me?msgDestLib(o):(o.de+((o.cles||[]).some(c=>/^(s:|f:|\*|r:agent|r:chef|r:major)/.test(c))?' → '+msgDestLib(o):''));
  return{k,ms,o,der,nl,titre,objet:k==='notif'?'Notifications':o.objet||''}}).sort((a,b)=>String(b.der.t).localeCompare(String(a.der.t)))}
function filDest(F){const me=maCle();if(F.k==='notif')return null;if(F.o.deCle===me)return F.o.dest;const autre=F.ms.slice().reverse().find(m=>m.deCle!==me);return[{k:autre.deCle,lib:autre.de}]}
const ini=s=>String(s||'?').replace(/\(.*\)/,'').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
const hHM=t=>{const d=new Date(t);return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
const jourLib=t=>{const k=String(t).slice(0,10),T=today();if(k===T)return"Aujourd'hui";const y=new Date(Date.now()-864e5);const Y=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;return k===Y?'Hier':fdate(k)};
function chatPage(){const me=maCle(),FS=fils(),q=kNorm(S.msgQ||''),vis=q?FS.filter(F=>kNorm(F.titre+' '+F.objet+' '+F.ms.map(m=>m.texte||m.titre||'').join(' ')).includes(q)):FS;
 let cur=FS.find(F=>F.k===S.fil);if(!cur&&!S.filMob&&vis.length&&!vis[0].nl&&typeof window!=='undefined'&&window.innerWidth>900)cur=vis[0];
 if(cur){const L=msgLuSet(),aLire=cur.ms.filter(m=>m.deCle!==me&&!msgEstLu(m,L));if(aLire.length){aLire.forEach(msgMarquer);save();setTimeout(()=>{if(typeof bnavRender==='function')bnavRender()},0)}}
 const liste=`<div class="chl">${vis.length?vis.map(F=>`<button class="chf${cur&&cur.k===F.k?' on':''}" data-act="filOuvrir" data-k="${esc(F.k)}"><span class="av">${F.k==='notif'?'🔔':esc(ini(F.titre))}</span><span class="cx"><span class="row" style="gap:6px;flex-wrap:nowrap"><b class="tt">${esc(F.titre)}</b><span class="sp"></span><small>${jourLib(F.der.t)==="Aujourd'hui"?hHM(F.der.t):jourLib(F.der.t)}</small></span><span class="row" style="gap:6px;flex-wrap:nowrap"><span class="ex">${F.der.deCle===me?'Vous : ':''}${esc((F.der.texte||F.der.titre||F.der.objet||'').replace(/\s+/g,' ').slice(0,80))}</span><span class="sp"></span>${F.nl?`<span class="nb">${F.nl}</span>`:''}</span></span></button>`).join(''):'<div class="empty">Aucune discussion. Écrivez un premier message.</div>'}</div>`;
 let zone='<div class="chz vide"><div class="empty">Choisissez une discussion à gauche, ou écrivez un nouveau message.</div></div>';
 if(cur){const dest=filDest(cur),grp=cur.ms.some(m=>m.deCle!==me&&(m.cles||[]).some(c=>!/^(a:|u:)/.test(c)));let jour='';
  const bul=cur.ms.map(m=>{const moi=m.deCle===me&&!msgNotif(m),j=jourLib(m.t),sep=j!==jour?(jour=j,`<div class="chj"><span>${esc(j)}</span></div>`):'';
   return sep+`<div class="chb ${moi?'env':'rec'}"><div class="bul">${!moi&&(grp||cur.k==='notif')?`<div class="au">${esc(msgNotif(m)?(m.titre||'SENHOP RH'):m.de)}</div>`:''}${m.objet&&(m===cur.ms[0]||/^RE ?:/i.test(m.objet)===false&&m.objet!==cur.ms[0].objet)?`<div class="ob">${esc(m.objet)}</div>`:''}${(msgNotif(m)?m.texte:m.texte)?`<div class="tx">${esc(m.texte||'')}</div>`:''}
    ${(m.pj||[]).map(p=>`<button class="pjb" data-act="msgPj" data-m="${m.id}" data-id="${esc(p.id)}">📎 ${esc(p.nom)} <small>${Math.max(1,Math.round((p.taille||0)/1024))} Ko</small></button>`).join('')}
    ${msgNotif(m)&&m.page?`<button class="pjb" data-act="msgLire" data-id="${m.id}">Ouvrir →</button>`:''}<div class="hr">${hHM(m.t)}${moi?' ✓':''}</div></div></div>`}).join('');
  zone=`<div class="chz"><div class="chh"><button class="btn g s chback" data-act="filRetour" aria-label="Retour aux discussions">←</button><span class="av">${cur.k==='notif'?'🔔':esc(ini(cur.titre))}</span><div style="min-width:0"><b class="tt">${esc(cur.titre)}</b><div class="sub tt">${esc(cur.objet)}${dest?' · à : '+esc(dest.map(d=>d.lib).join(', ')):''}</div></div></div>
  <div class="chm" id="chm">${bul}</div>${dest?`<div class="chc"><label class="btn g s chpj" title="Joindre des fichiers">📎<input type="file" id="ch_pj" multiple hidden data-chg="chPj"></label><div style="flex:1;min-width:0"><div id="ch_pjl" class="sub"></div><textarea id="ch_txt" rows="1" placeholder="Écrire un message…" aria-label="Votre message"></textarea></div><button class="btn chsend" data-act="chEnvoyer" aria-label="Envoyer">➤</button></div>`:'<div class="chc sub" style="justify-content:center">Notifications automatiques : pas de réponse possible.</div>'}</div>`}
 if(typeof document!=='undefined')setTimeout(()=>{const z=document.getElementById('chm');if(z)z.scrollTop=z.scrollHeight;const t=document.getElementById('ch_txt');if(t){t.oninput=()=>{t.style.height='auto';t.style.height=Math.min(140,t.scrollHeight)+'px'};t.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ACT.chEnvoyer()}}}},0);
 return`<div class="chat${cur&&S.filMob?' mob':''}">${liste}${zone}</div>`}
const messagesCH=PAGES.messages;
PAGES.messages=()=>{if(!S.msgF)S.msgF='chat';if(S.msgF!=='chat')return messagesCH().replace('<div class="row" style="gap:8px"><button class="btn','<div class="row" style="gap:8px"><button class="btn g" data-act="msgF" data-f="chat">💬 Discussions</button><button class="btn');
 const nl=msgN();return`<div class="head"><div><h1>Messages</h1><div class="sub">${nl?`${nl} message(s) non lu(s)`:'Tous vos messages sont lus'}</div></div><span class="sp"></span><button class="btn" data-act="msgNouveau">✎ Nouveau message</button></div>
 <div class="row" style="gap:8px"><button class="btn" data-act="msgF" data-f="chat">💬 Discussions</button><button class="btn g" data-act="msgF" data-f="recus">Reçus</button><button class="btn g" data-act="msgF" data-f="nonlus">Non lus${nl?` <span class="pill crit" style="margin-left:4px">${nl}</span>`:''}</button><button class="btn g" data-act="msgF" data-f="env">Envoyés</button><span class="sp"></span><input type="search" id="msg_q" placeholder="Rechercher…" value="${esc(S.msgQ||'')}" data-chg="msgQ" style="min-width:220px" aria-label="Rechercher dans les messages"></div>${chatPage()}`};
ACT.msgF=d=>{S.msgF=d.f;render()};
ACT.msgVoir=d=>{S.msgF=d.f==='nonlus'?'chat':(d.f||'chat');if(d.f==='nonlus'){const F=fils().find(x=>x.nl);if(F){S.fil=F.k;S.filMob=true}}S.page='messages';render()};
ACT.filOuvrir=d=>{S.fil=d.k;S.filMob=true;render()};ACT.filRetour=()=>{S.filMob=false;S.fil=null;render()};
CHG.chPj=el=>{const l=document.getElementById('ch_pjl');if(l)l.textContent=[...el.files].map(f=>'📎 '+f.name).join('  ')};
ACT.chEnvoyer=async()=>{const F=fils().find(x=>x.k===S.fil)||fils()[0];if(!F)return;const dest=filDest(F),t=document.getElementById('ch_txt'),txt=(t&&t.value||'').trim(),fs=[...((document.getElementById('ch_pj')||{}).files||[])];
 if(!dest)return;if(!txt&&!fs.length)return;const gros=fs.find(f=>f.size>26214400);if(gros)return toast(`« ${gros.name} » dépasse 25 Mo.`,'err');
 const pj=[],pre=S.profil.role==='agent'&&S.profil.agentId?S.profil.agentId+'_':'';for(const f of fs){const id=pre+'M'+uid();try{await filePut(id,f)}catch(e){return toast(`« ${f.name} » n'a pas pu être envoyé.`,'err')}pj.push({id,nom:f.name,taille:f.size,mime:f.type||''})}
 const m={id:'M'+uid(),t:new Date().toISOString(),de:who(),deCle:maCle(),objet:F.o.objet?(/^RE ?:/i.test(F.o.objet)?F.o.objet:'RE : '+F.o.objet):'',texte:txt,pj,dest:dest.map(x=>({k:x.k,lib:x.lib})),cles:dest.map(x=>x.k),fil:F.k};
 if(S.profil.agentId)m.deAgent=S.profil.agentId;DB.messages.unshift(m);S.fil=F.k;save();render()};
/* Les réponses et les nouveaux messages gardent le fil de la discussion */
ACT.msgRepondre=(f=>function(d){const m=DB.messages.find(x=>x.id===d.id);f.apply(this,arguments);if(S.cmp&&m)S.cmp.fil=filDe(m)})(ACT.msgRepondre);
ACT.cmpEnvoyer=(f=>async function(){const fil=S.cmp&&S.cmp.fil,n0=DB.messages.length;await f.apply(this,arguments);if(DB.messages.length>n0){const m=DB.messages[0];if(fil){m.fil=fil;S.fil=fil}else S.fil=m.id;S.msgF='chat';S.filMob=true;save();render()}})(ACT.cmpEnvoyer);
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`
.chat{display:grid;grid-template-columns:320px 1fr;gap:0;margin-top:12px;height:calc(100vh - 230px);min-height:460px;border:1px solid var(--bord);border-radius:16px;overflow:hidden;background:#fff}
.chl{overflow:auto;border-right:1px solid var(--bord);background:#fbfcfe}.chf{display:flex;gap:10px;width:100%;text-align:left;border:0;border-bottom:1px solid #eef2f7;background:transparent;padding:11px 12px;cursor:pointer;font:inherit;color:var(--encre)}
.chf:hover{background:#f2f6fd}.chf.on{background:var(--bleu-pale)}.cx{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.tt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}.chf small{color:var(--gris);font-size:11.5px;white-space:nowrap}
.ex{color:var(--gris);font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nb{background:#2563eb;color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:1px 7px}
.av{width:38px;height:38px;flex:none;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1e3a8a);color:#fff;display:grid;place-items:center;font-weight:700;font-size:13px}
.chz{display:flex;flex-direction:column;min-width:0;min-height:0;background:#f4f7fb}.chz.vide{display:grid;place-items:center}
.chh{display:flex;gap:10px;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid var(--bord)}.chback{display:none}
.chm{flex:1;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:6px}
.chj{text-align:center;margin:8px 0}.chj span{background:#e4eaf3;color:#4a5a70;font-size:11.5px;font-weight:600;padding:3px 10px;border-radius:999px}
.chb{display:flex}.chb.env{justify-content:flex-start}.chb.rec{justify-content:flex-end}
.bul{max-width:min(72%,560px);padding:8px 12px 6px;border-radius:16px;box-shadow:0 1px 2px rgba(15,35,70,.08);display:flex;flex-direction:column;gap:4px}
.chb.env .bul{background:#fff;color:var(--encre);border:1px solid #e1e7f0;border-top-left-radius:4px}
.chb.rec .bul{background:#2563eb;color:#fff;border-top-right-radius:4px}
.bul .au{font-size:12px;font-weight:700;opacity:.9}.bul .ob{font-weight:700;font-size:13px}.bul .tx{white-space:pre-wrap;word-wrap:break-word;line-height:1.4}.bul .hr{font-size:11px;opacity:.7;align-self:flex-end}
.pjb{display:inline-flex;gap:6px;align-items:center;border-radius:10px;padding:6px 10px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;text-align:left;border:1px solid #d7e1ee;background:#f3f6fb;color:var(--encre)}
.chb.rec .pjb{background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.35);color:#fff}.pjb small{opacity:.75}
.chc{display:flex;gap:8px;align-items:flex-end;padding:10px 12px;background:#fff;border-top:1px solid var(--bord)}.chc textarea{width:100%;resize:none;border-radius:18px;padding:9px 14px;max-height:140px;min-height:40px;box-sizing:border-box}
.chsend{border-radius:50%;width:42px;height:42px;padding:0;font-size:17px}.chpj{border-radius:50%;width:40px;height:40px;padding:0;display:grid;place-items:center;cursor:pointer}
@media(max-width:900px){.chat{grid-template-columns:1fr;height:auto;min-height:0}.chat .chl{max-height:none}.chm{min-height:240px;max-height:calc(100vh - 360px)}.chc{position:sticky;bottom:76px;z-index:2}.chat .chz{display:none}.chat.mob .chl{display:none}.chat.mob .chz{display:flex}.chback{display:inline-flex}.bul{max-width:86%}}`;document.head&&document.head.appendChild(st)}

CHG.profil=(f=>function(){S.msgF='chat';S.fil=null;S.filMob=false;return f.apply(this,arguments)})(CHG.profil);
