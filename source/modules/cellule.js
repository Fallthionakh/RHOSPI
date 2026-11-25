/* ============ Fiche de poste : cellule ; listes division / unité / cellule modifiables ============ */
ADDK.cellule={t:'Nouvelle cellule'};
const ORG_L={division:['divisions','Division','division'],unite:['unites','Unité','unite'],cellule:['cellules','Cellule','cellule']};
const migrateCE=migrate;migrate=function(db){migrateCE(db);db.listes.cellules=db.listes.cellules||[];return db};
const posteOccCE=EDIT.posteOcc.f;
EDIT.posteOcc.f=x=>{const f=posteOccCE(x),i=f.findIndex(z=>z[0]==='unite');f.splice(i<0?f.length:i+1,0,['cellule','Cellule','select',[['','—'],...DB.listes.cellules.map(z=>[z,z])],'cellule']);return f};
function orgOpts(sel,k){const cur=sel.value,L=DB.listes[ORG_L[k][0]];sel.innerHTML=`<option value="">—</option>${L.map(z=>`<option${z===cur?' selected':''}>${esc(z)}</option>`).join('')}${can('config')?'<option value="__add__">+ Ajouter…</option><option value="__gerer__">✎ Modifier la liste…</option>':''}`;if(L.includes(cur))sel.value=cur;else sel.value=''}
ACT.edit=(g=>function(d){const r=g.apply(this,arguments);if(d.k==='posteOcc')Object.keys(ORG_L).forEach(k=>{const s=document.getElementById('e_'+k);if(!s)return;if(can('config')&&!s.querySelector('option[value=__gerer__]')){const o=document.createElement('option');o.value='__gerer__';o.textContent='✎ Modifier la liste…';s.appendChild(o)}
 let prev=s.value;s.addEventListener('change',()=>{if(s.value==='__gerer__'){s.value=prev;orgGerer(k)}else if(s.value!=='__add__')prev=s.value})});return r})(ACT.edit);
function orgGerer(k){const[lst,lib]=ORG_L[k],L=DB.listes[lst],n=v=>DB.agents.filter(a=>a[k]===v).length;
 $('#layer2').innerHTML=`<div class="modal" style="z-index:25"><div role="dialog" aria-label="Liste des ${lib.toLowerCase()}s" style="max-width:560px"><h2>${lib}s : ajouter, renommer, supprimer</h2>
 <div style="display:flex;flex-direction:column;gap:8px">${L.length?L.map((v,i)=>`<div class="row" style="flex-wrap:nowrap;gap:8px"><input id="og_${i}" value="${esc(v)}" style="flex:1" aria-label="${esc(lib)} ${i+1}"><span class="sub" style="white-space:nowrap">${n(v)} agent(s)</span><button class="btn r s" data-act="orgSuppr" data-k="${k}" data-i="${i}"${n(v)?' disabled title="Utilisée par des agents : renommez-la ou changez d\'abord leur fiche"':''}>Supprimer</button></div>`).join(''):`<div class="empty">Aucune ${lib.toLowerCase()} pour l'instant.</div>`}
 <div class="row" style="flex-wrap:nowrap;gap:8px;margin-top:6px"><input id="og_new" placeholder="Nouvelle ${lib.toLowerCase()}" style="flex:1"><button class="btn g s" data-act="orgAjout" data-k="${k}">+ Ajouter</button></div></div>
 <div class="sub">Renommer met à jour la fiche de tous les agents concernés.</div><div class="row" style="justify-content:flex-end"><button class="btn g" data-act="orgFermer" data-k="${k}">Fermer</button><button class="btn" data-act="orgOk" data-k="${k}">Enregistrer</button></div></div></div>`}
function orgMajSelect(k,ren){const s=document.getElementById('e_'+k);if(!s)return;if(ren&&ren[s.value]){const o=document.createElement('option');o.value=ren[s.value];s.appendChild(o);s.value=ren[s.value]}orgOpts(s,k)}
Object.assign(ACT,{
 orgAjout:d=>{const[lst,lib]=ORG_L[d.k],v=val('og_new').trim();if(!v)return toast('Indiquez le nom.','err');if(DB.listes[lst].some(z=>z.toLowerCase()===v.toLowerCase()))return toast(`« ${v} » existe déjà.`,'err');DB.listes[lst].push(v);audit('Ajout à une liste',`${lib} : ${v}`);save();orgGerer(d.k);orgMajSelect(d.k)},
 orgSuppr:d=>{const[lst,lib]=ORG_L[d.k],L=DB.listes[lst],v=L[+d.i];if(DB.agents.some(a=>a[d.k]===v))return;L.splice(+d.i,1);audit('Suppression dans une liste',`${lib} : ${v}`);save();orgGerer(d.k);orgMajSelect(d.k)},
 orgOk:d=>{const[lst,lib]=ORG_L[d.k],L=DB.listes[lst],nv=L.map((v,i)=>{const e=document.getElementById('og_'+i);return e?e.value.trim():v});
  if(nv.some(v=>!v))return toast('Un nom ne peut pas être vide.','err');if(new Set(nv.map(v=>v.toLowerCase())).size!==nv.length)return toast('Deux éléments portent le même nom.','err');
  const ch=[],ren={};L.forEach((v,i)=>{if(v!==nv[i]){ch.push(`${v} → ${nv[i]}`);ren[v]=nv[i];DB.agents.forEach(a=>{if(a[d.k]===v)a[d.k]=nv[i]});L[i]=nv[i]}});
  if(ch.length){audit('Liste renommée',`${lib} : ${ch.join(' ; ')}`);save();toast(`${ch.length} ${lib.toLowerCase()}(s) renommée(s).`,'ok')}$('#layer2').innerHTML='';orgMajSelect(d.k,ren)},
 orgFermer:d=>{$('#layer2').innerHTML='';orgMajSelect(d.k)}});
