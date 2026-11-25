/* ============ Pièces jointes des messages : aperçu avec téléchargement ============ */
const PJ_C=new Map();
async function pjBlob(m,p){if(PJ_C.has(p.id))return PJ_C.get(p.id);let b;try{b=await fileGet(p.id)}catch(e){}if(b)PJ_C.set(p.id,b);return b}
ACT.msgPj=async d=>{const m=DB.messages.find(x=>x.id===d.m),p=(m.pj||[]).find(x=>x.id===d.id);if(!p)return;
 const L2=$('#layer2'),ext=(p.nom.split('.').pop()||'').toLowerCase(),haut=`<div class="row" style="gap:8px;flex-wrap:nowrap"><h2 style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📎 ${esc(p.nom)}</h2><span class="sub">${Math.max(1,Math.round((p.taille||0)/1024))} Ko</span></div>`;
 const pied=`<div class="row" style="justify-content:flex-end;gap:8px"><button class="btn g" data-act="pjFermer">Fermer</button><button class="btn g" data-act="pjOnglet" data-m="${m.id}" data-id="${esc(p.id)}">Ouvrir dans un onglet</button><button class="btn" data-act="pjDl" data-m="${m.id}" data-id="${esc(p.id)}">⤓ Télécharger</button></div>`;
 const ouvre=corps=>{L2.innerHTML=`<div class="modal" style="z-index:25" data-act="pjFond"><div role="dialog" aria-label="${esc(p.nom)}" style="max-width:980px;width:100%">${haut}<div id="pjv" style="background:var(--mute);border-radius:10px;padding:10px;max-height:70vh;overflow:auto;display:flex;flex-direction:column;align-items:center;gap:10px">${corps}</div>${pied}</div></div>`};
 ouvre('<div class="sub" style="padding:30px">Chargement…</div>');const b=await pjBlob(m,p),box=()=>$('#pjv');
 if(!b){if(box())box().innerHTML='<div class="sub" style="padding:30px">La pièce jointe n\'a pas pu être chargée (pas de connexion, ou fichier envoyé depuis un poste hors ligne).</div>';return}
 const u=URL.createObjectURL(b),mime=(p.mime||b.type||'');
 if(/^image\//.test(mime)||['png','jpg','jpeg','webp','gif','bmp','svg'].includes(ext))box().innerHTML=`<img src="${u}" alt="${esc(p.nom)}" style="max-width:100%;height:auto;border-radius:8px;background:#fff">`;
 else if(/^video\//.test(mime)||['mp4','webm','mov'].includes(ext))box().innerHTML=`<video src="${u}" controls style="max-width:100%;border-radius:8px"></video>`;
 else if(/^audio\//.test(mime)||['mp3','wav','ogg','m4a'].includes(ext))box().innerHTML=`<audio src="${u}" controls style="width:100%"></audio>`;
 else if(['txt','csv','json','md','log'].includes(ext)||/^text\//.test(mime))box().innerHTML=`<pre style="white-space:pre-wrap;width:100%;margin:0;background:#fff;padding:12px;border-radius:8px">${esc((await b.text()).slice(0,30000))}</pre>`;
 else if(ext==='pdf'||mime==='application/pdf'){try{await loadPdfJs();const pdf=await window.pdfjsLib.getDocument({data:await b.arrayBuffer()}).promise,n=Math.min(pdf.numPages,20);if(!box())return;box().innerHTML='';
   for(let k=1;k<=n;k++){const pg=await pdf.getPage(k),vp=pg.getViewport({scale:1.5}),c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;c.style.cssText='max-width:100%;height:auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)';if(!box())return;box().appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise}
   if(pdf.numPages>n)box().insertAdjacentHTML('beforeend',`<div class="sub">Aperçu des ${n} premières pages sur ${pdf.numPages} : téléchargez pour tout lire.</div>`)}
  catch(e){if(box())box().innerHTML=`<iframe src="${u}" title="${esc(p.nom)}" style="width:100%;height:65vh;border:0;background:#fff;border-radius:8px"></iframe>`}}
 else box().innerHTML=`<div style="padding:30px;text-align:center"><div style="font-size:40px">📄</div><p>L'aperçu n'est pas disponible pour les fichiers <b>.${esc(ext)}</b>.</p><p class="sub">Téléchargez le fichier pour l'ouvrir avec le logiciel adapté (Word, Excel…).</p></div>`};
Object.assign(ACT,{pjFermer:()=>{$('#layer2').innerHTML=''},pjFond:(d,el,e)=>{if(e&&e.target===el)$('#layer2').innerHTML=''},
 pjDl:async d=>{const m=DB.messages.find(x=>x.id===d.m),p=(m.pj||[]).find(x=>x.id===d.id),b=await pjBlob(m,p);if(!b)return toast('Pièce jointe indisponible.','err');await telecharger(p.nom,b)},
 pjOnglet:async d=>{const m=DB.messages.find(x=>x.id===d.m),p=(m.pj||[]).find(x=>x.id===d.id),b=await pjBlob(m,p);if(!b)return toast('Pièce jointe indisponible.','err');const w=window.open(URL.createObjectURL(b),'_blank');if(!w)toast('Le navigateur a bloqué l\'ouverture : utilisez « Télécharger ».','err')}});

CHG.profil=(f=>function(){S.msgF='recus';return f.apply(this,arguments)})(CHG.profil);
