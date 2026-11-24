/* ============ Sous-effectif : diagnostic, pointage et renfort depuis l'alerte ============ */
effectifService=function(sv,now=new Date()){ // vacations en cours : aujourd'hui + nuit de la veille
 const T=dkey(now),rs=[];actifs([sv.id]).forEach(a=>[addDays(T,-1),T].forEach(d=>{const r=etat(a.id,d,now);if(r.prog>0&&!r.abs&&r.s<=now&&now<r.e)rs.push(r)}));
 const presents=rs.filter(r=>r.p&&r.p.arr&&new Date(r.p.arr)<=now&&(!r.p.dep||new Date(r.p.dep)>now));
 return{programmes:rs,presents,manque:Math.max(0,sv.min-presents.length),manquePlanning:Math.max(0,sv.min-rs.length),sous:rs.length>0&&presents.length<sv.min};
};
const alertesSousBase=alertes;
alertes=function(ids,now=new Date()){return alertesSousBase(ids,now).map(a=>{if(!a.key.startsWith('sous|'))return a;const sv=svc(a.sid),e=effectifService(sv,now),np=e.programmes.length-e.presents.length;
 const det=e.manquePlanning?` Le planning ne prévoit que ${e.programmes.length} agent(s) : même si tous sont présents, il manque ${e.manquePlanning} agent(s). Programmez un renfort.`:` ${np} agent(s) programmé(s) non pointé(s) ou absent(s).`;
 return{...a,texte:a.texte+det}})};
ALX.sous=['Régulariser l\'effectif',()=>can('pointer')||can('planifier')];
function vacEnCours(sid,now=new Date()){const T=dkey(now),w=vacsFor(sid).filter(v=>v&&v.travail&&v.debut&&v.fin);const c=w.filter(v=>{const b=bornes(v,T);return b.s<=now&&now<b.e});return c.length?c:w}
function renfortsPossibles(sid,now=new Date()){const T=dkey(now);return actifs([sid]).filter(a=>{if(absOf(a.id,T))return false;const v=vacOf(a.id,T);if(v&&v.travail)return false;const p=PIX.get(a.id+'|'+T);return!(p&&p.arr)})}
function sousModal(sid){const sv=svc(sid),now=new Date(),T=dkey(now),e=effectifService(sv,now),ok=!e.sous;
 const lig=e.programmes.map(r=>{const a=ag(r.agentId),p=r.p||{},pres=e.presents.includes(r);
  return`<tr><td><b>${esc(nomA(a))}</b><br><span class="sub">${a.mat} · ${esc(poste(a.posteId).nom)}</span></td><td><span class="vc v${vk(r.vac.code)}">${r.vac.code}</span> ${hm(r.s)}–${hm(r.e)}${r.date!==T?' <span class="tag">veille</span>':''}</td><td>${pill(r.statut)}${p.arr?` <span class="sub">arrivé(e) à ${hm(p.arr)}</span>`:''}<div style="margin-top:6px">${pres?'':!p.arr&&!p.absent&&r.date===T&&can('pointer')?`<div class="row" style="flex-wrap:nowrap;gap:6px"><input type="time" id="so_h_${a.id}" value="${hm(r.s)}" aria-label="Heure d'arrivée"><button class="btn v s" data-act="sousArr" data-id="${a.id}" data-s="${sid}">Présent</button></div>`:p.id&&can('pointer')?`<button class="btn g s" data-act="corr" data-id="${p.id}">Corriger</button>`:''}</div></td></tr>`});
 const cand=renfortsPossibles(sid,now),vacs=vacEnCours(sid,now);
 const renf=can('planifier')&&!ok?`<h3 style="margin:18px 0 6px">Programmer un renfort</h3>${cand.length?`<div class="form"><label class="field">Agent du service disponible<select id="so_ag">${opt(cand,'',a=>[a.id,`${nomA(a)} — ${a.mat} · ${poste(a.posteId).nom}`])}</select></label><label class="field">Vacation<select id="so_vac">${opt(vacs,(e.programmes[0]&&e.programmes[0].vac.code)||'',v=>[v.code,`${v.code} — ${v.nom} (${v.debut}–${v.fin})`])}</select></label><label class="field">Arrivée déjà effective ?<select id="so_pr"><option value="">Non, il/elle va arriver</option><option value="1">Oui, pointer l'arrivée</option></select></label><label class="field">Heure d'arrivée<input type="time" id="so_h" value="${hm(now)}"></label></div><div class="row" style="justify-content:flex-end"><button class="btn v" data-act="sousRenfort" data-s="${sid}">Ajouter le renfort</button></div>`:'<div class="sub">Aucun autre agent du service n\'est disponible aujourd\'hui (tous programmés, en congé ou absents). Ajoutez un agent au service ou ajustez le planning.</div>'}`:'';
 modal(`Sous-effectif — ${sv.nom}`,`<div class="alert ${ok?'':'haute'}" style="margin-bottom:12px"><div><b>${e.presents.length} en poste / minimum ${sv.min}</b> · ${e.programmes.length} programmé(s) sur la vacation en cours${ok?'<br>L\'effectif minimum est atteint : l\'alerte est levée.':e.manquePlanning?`<br>Le planning est insuffisant : il manque ${e.manquePlanning} agent(s) même si tous les programmés sont présents.`:''}</div></div>
 ${table(['Agent','Vacation','Statut et action'],lig,'Aucun agent programmé sur la vacation en cours.')}${renf}
 <div class="sub" style="margin-top:10px">Le minimum de ${sv.min} agent(s) se modifie dans Paramètres › Services si la norme du service a changé.</div>`,`<button class="btn g" data-act="close">Fermer</button>`)}
Object.assign(ACT,{
 alerteOuvrir:(base=>d=>{const[t,x]=d.k.split('|');if(t==='sous'){S.alerteK=d.k;return sousModal(x)}return base(d)})(ACT.alerteOuvrir),
 sousArr:d=>{const h=val('so_h_'+d.id);if(!h)return toast('Indiquez l\'heure d\'arrivée.','err');const r=pointer(d.id,'arr',{mode:'manuel',decl:at(today(),h)});if(!res(r))return;render();sousModal(d.s)},
 sousRenfort:d=>{const id=val('so_ag'),code=val('so_vac'),T=today();if(!id||!code)return toast('Choisissez l\'agent et la vacation.','err');const a=ag(id);
  DB.planning[id+'|'+T]=code;audit('Renfort programmé',`${nomA(a)} — ${svc(d.s).nom}, vacation ${code} le ${fdate(T)}`);save();
  if(val('so_pr')){const h=val('so_h');if(!h)return toast('Indiquez l\'heure d\'arrivée.','err');const r=pointer(id,'arr',{mode:'manuel',decl:at(T,h)});if(!r.ok){render();sousModal(d.s);return toast(r.msg,'err')}}
  toast(`${nomA(a)} programmé(e) en renfort (${code}).`,'ok');render();sousModal(d.s)}
});
