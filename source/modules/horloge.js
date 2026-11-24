/* ============ Borne : horloge, calendrier, heure choisie et récapitulatif ============ */
const JOURS_L=['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],MOIS_L=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const KQ_JOURS=7; // nombre de jours en arrière autorisés pour une heure déclarée
function kq(){if(!S.kq)S.kq={mode:'now',date:today(),h:null,m:null,pas:'h',mois:today().slice(0,7)};return S.kq}
const p2=n=>String(n).padStart(2,'0');
function kqDecl(){const q=kq();if(q.mode==='now'||q.h==null)return new Date();return at(q.date,`${p2(q.h)}:${p2(q.m||0)}`)}
const dateLongue=d=>`${JOURS_L[d.getDay()]} ${d.getDate()} ${MOIS_L[d.getMonth()]} ${d.getFullYear()}`;
/* Horloge analogique (aiguilles mises à jour chaque seconde) */
function horlogeSVG(taille=132){const tr=[...Array(12)].map((_,i)=>{const a=i*30*Math.PI/180,r1=i%3?44:41;return`<line x1="${50+r1*Math.sin(a)}" y1="${50-r1*Math.cos(a)}" x2="${50+47*Math.sin(a)}" y2="${50-47*Math.cos(a)}" stroke="currentColor" stroke-width="${i%3?1.2:2.4}" stroke-linecap="round"/>`}).join('');
 return`<svg class="horloge" viewBox="0 0 100 100" width="${taille}" height="${taille}" aria-hidden="true"><circle cx="50" cy="50" r="48" class="hc"/>${tr}
  <line class="hh" x1="50" y1="50" x2="50" y2="27" stroke-width="4.5" stroke-linecap="round"/><line class="hm" x1="50" y1="50" x2="50" y2="14" stroke-width="3" stroke-linecap="round"/><line class="hs" x1="50" y1="56" x2="50" y2="10" stroke-width="1.2" stroke-linecap="round"/><circle cx="50" cy="50" r="3.2" class="hp"/></svg>`}
function horlogeMaj(){const q=kq(),d=q.mode==='now'?new Date():kqDecl(),h=d.getHours()%12,m=d.getMinutes(),s=q.mode==='now'?d.getSeconds():0;
 document.querySelectorAll('svg.horloge').forEach(svg=>{const rot=(el,deg)=>{const x=svg.querySelector(el);if(x)x.setAttribute('transform',`rotate(${deg} 50 50)`)};rot('.hh',h*30+m*.5);rot('.hm',m*6+s*.1);rot('.hs',s*6);svg.querySelector('.hs').style.display=q.mode==='now'?'':'none'});
 document.querySelectorAll('.kDig').forEach(x=>x.textContent=`${p2(d.getHours())}:${p2(m)}${q.mode==='now'?':'+p2(d.getSeconds()):''}`);document.querySelectorAll('.kDate').forEach(x=>x.textContent=dateLongue(d));
 if(S.kr&&q.mode==='now'){const b=document.querySelector('.recapDl .big');if(b)b.textContent=hm(new Date().toISOString())}}
setInterval(()=>{if(document.querySelector('svg.horloge')&&kq().mode==='now')horlogeMaj()},1000);
/* Calendrier du mois (jours futurs et trop anciens grisés) */
function calHtml(){const q=kq(),[y,mo]=q.mois.split('-').map(Number),prem=new Date(y,mo-1,1,12),dec=(prem.getDay()+6)%7,nb=new Date(y,mo,0).getDate(),T=today(),min=addDays(T,-KQ_JOURS);
 let c='';for(let i=0;i<dec;i++)c+='<span></span>';for(let j=1;j<=nb;j++){const d=`${y}-${p2(mo)}-${p2(j)}`,ok=d<=T&&d>=min;c+=`<button type="button" class="cj ${d===q.date?'on':''} ${d===T?'auj':''}" ${ok?`data-act="kqJour" data-v="${d}"`:'disabled'}>${j}</button>`}
 const prevOk=`${y}-${p2(mo)}-01`>min,nextOk=q.mois<T.slice(0,7);
 return`<div class="cal"><div class="calHd"><button type="button" class="calNav" data-act="kqMois" data-v="-1" ${prevOk?'':'disabled'} aria-label="Mois précédent">‹</button><b>${MOIS_L[mo-1]} ${y}</b><button type="button" class="calNav" data-act="kqMois" data-v="1" ${nextOk?'':'disabled'} aria-label="Mois suivant">›</button></div>
  <div class="calG">${['L','M','M','J','V','S','D'].map(x=>`<i>${x}</i>`).join('')}${c}</div></div>`}
/* Cadran de choix de l'heure (heures puis minutes) */
function cadranHtml(){const q=kq(),h=q.h??new Date().getHours(),m=q.m??0,pt=(v,r,n)=>{const a=v*(360/n)*Math.PI/180;return[50+r*Math.sin(a),50-r*Math.cos(a)]};let s='';
 if(q.pas==='h'){for(let i=0;i<12;i++){const[x,y]=pt(i,38,12),v=i===0?12:i,on=h===v;s+=`<g class="cn ${on?'on':''}" data-h="${v}"><circle cx="${x}" cy="${y}" r="7"/><text x="${x}" y="${y}">${v}</text></g>`;
   const[x2,y2]=pt(i,25,12),v2=i===0?0:i+12,on2=h===v2;s+=`<g class="cn in ${on2?'on':''}" data-h="${v2}"><circle cx="${x2}" cy="${y2}" r="6"/><text x="${x2}" y="${y2}">${p2(v2)}</text></g>`}
  const ang=(h%12)*30,r=(h===0||h>12)?25:38,[hx,hy]=pt(h%12,r,12);s=`<line x1="50" y1="50" x2="${hx}" y2="${hy}" class="aig"/>`+s}
 else{for(let i=0;i<12;i++){const[x,y]=pt(i,38,12),v=i*5,on=m===v;s+=`<g class="cn ${on?'on':''}" data-m="${v}"><circle cx="${x}" cy="${y}" r="7"/><text x="${x}" y="${y}">${p2(v)}</text></g>`}const[mx,my]=pt(m,38,60);s=`<line x1="50" y1="50" x2="${mx}" y2="${my}" class="aig"/><circle cx="${mx}" cy="${my}" r="2" class="aigB"/>`+s}
 return`<div class="cadranBox"><div class="cadranTop"><button type="button" class="${q.pas==='h'?'on':''}" data-act="kqPas" data-v="h">${p2(h)}</button>:<button type="button" class="${q.pas==='m'?'on':''}" data-act="kqPas" data-v="m">${p2(m)}</button></div>
  <svg class="cadran" viewBox="0 0 100 100" width="210" height="210" role="img" aria-label="Choisir ${q.pas==='h'?'l\'heure':'les minutes'}"><circle cx="50" cy="50" r="48" class="cf"/>${s}<circle cx="50" cy="50" r="1.8" class="aigB"/></svg>
  <div class="row kqAjust"><button type="button" class="btn g s" data-act="kqPlus" data-v="-5">−5 min</button><button type="button" class="btn g s" data-act="kqPlus" data-v="-1">−1</button><input type="time" id="kqTime" value="${p2(h)}:${p2(m)}" aria-label="Heure exacte"><button type="button" class="btn g s" data-act="kqPlus" data-v="1">+1</button><button type="button" class="btn g s" data-act="kqPlus" data-v="5">+5 min</button></div></div>`}
function horodatageHtml(){const q=kq();
 return`<div class="horo"><div class="horoNow">${horlogeSVG()}<div><div class="horoLab">${q.mode==='now'?'Heure actuelle':'Heure choisie'}</div><b class="kDig">--:--</b><span class="kDate"></span></div></div>
  <div class="seg2" role="tablist"><button type="button" role="tab" class="${q.mode==='now'?'on':''}" data-act="kqMode" data-v="now">Maintenant</button><button type="button" role="tab" class="${q.mode==='choix'?'on':''}" data-act="kqMode" data-v="choix">Choisir la date et l'heure</button></div>
  ${q.mode==='choix'?`<div class="horoPick">${calHtml()}${cadranHtml()}</div><div class="sub">Une heure différente de l'heure actuelle de plus de ${paramsFor(S.kSvc).saisieTardive} minutes est enregistrée comme <b>heure déclarée</b>, avec un motif, et signalée au responsable.</div>`:''}</div>`}
function horoRefresh(){const el=document.querySelector('#main .horo');if(el){el.outerHTML=horodatageHtml();horlogeMaj()}}
/* Impact prévu : retard, départ anticipé, heures supplémentaires */
function kqImpact(a,type,decl){const pr=paramsFor(a.serviceId);
 if(type==='arr'){const d=dkey(decl),v=vacOf(a.id,d);if(!v||!v.travail||!v.debut)return{txt:'Pas de vacation programmée ce jour',cls:'crit'};const b=bornes(v,d),mn=Math.round((decl-b.s)/6e4);
  return{vac:`${v.nom} · ${hm(b.s)} – ${hm(b.e)}`,txt:mn>pr.tolerance?`Retard de ${mn} min`:mn<0?`En avance de ${-mn} min`:'À l\'heure',cls:mn>pr.tolerance?'warn':'ok'}}
 const T=today(),p=DB.pointages.filter(x=>x.agentId===a.id&&x.arr&&!x.dep&&x.date>=addDays(T,-1)).sort((x,y)=>x.date<y.date?1:-1)[0];if(!p)return{txt:'Aucune arrivée en cours',cls:'crit'};
 const v=vacOf(a.id,p.date);if(!v||!v.debut)return{txt:'Départ',cls:'ok',arr:p.arr};const b=bornes(v,p.date),mn=Math.round((b.e-decl)/6e4),pres=Math.round((decl-new Date(p.arr))/6e4);
 return{vac:`${v.nom} · ${hm(b.s)} – ${hm(b.e)}`,arr:p.arr,pres,txt:mn>pr.seuilDepart?`Départ anticipé de ${mn} min`:mn<-(pr.hsSeuil||15)?`Dépassement de ${-mn} min`:'À l\'heure',cls:mn>pr.seuilDepart?'warn':'ok'}}
function kqRecap(){const R=S.kr;if(!R)return;const a=ag(R.agentId),q=kq(),decl=kqDecl(),now=new Date(),ecart=Math.round(Math.abs(now-decl)/6e4),declaree=q.mode==='choix'&&ecart>paramsFor(a.serviceId).saisieTardive,I=kqImpact(a,R.type,decl);
 modal(`Vérifiez avant d'enregistrer`,`<div class="recap">
  <div class="recapHd">${a.photo?avatar(a):''}<div><b>${esc(nomA(a))}</b><span class="sub">${a.mat} · ${esc(svc(a.serviceId).nom)} · ${esc(fnom(a))}</span></div></div>
  <div class="seg2"><button type="button" class="${R.type==='arr'?'on':''}" data-act="krType" data-v="arr">Arrivée</button><button type="button" class="${R.type==='dep'?'on':''}" data-act="krType" data-v="dep">Départ</button></div>
  <dl class="fiche recapDl"><div><dt>Date</dt><dd>${dateLongue(decl)}</dd></div><div><dt>Heure ${R.type==='arr'?'d\'arrivée':'de départ'}</dt><dd class="big">${hm(decl.toISOString())}</dd></div>
   ${I.vac?`<div><dt>Vacation</dt><dd>${esc(I.vac)}</dd></div>`:''}${I.arr?`<div><dt>Arrivée enregistrée</dt><dd>${hm(I.arr)}${I.pres!=null?` · présence ${Math.floor(I.pres/60)} h ${p2(I.pres%60)}`:''}</dd></div>`:''}
   <div><dt>Situation</dt><dd><span class="pill ${I.cls}">${esc(I.txt)}</span></dd></div><div><dt>Mode</dt><dd>${declaree?'<span class="pill warn">Heure déclarée</span>':'<span class="pill ok">Heure réelle</span>'}</dd></div></dl>
  <details class="recapEdit" ${q.mode==='choix'?'open':''}><summary>Modifier la date ou l'heure</summary>${horodatageHtml()}</details>
  ${declaree?`<label class="field">Motif de l'heure déclarée (obligatoire)<textarea id="krMotif" rows="2" placeholder="ex. oubli de pointage à l'arrivée, panne de la borne…">${esc(R.motif||'')}</textarea></label>`:''}
 </div>`,`<button class="btn g" data-act="close">Annuler</button><button class="btn ${R.type==='arr'?'v':''}" data-act="kConf">Confirmer ${R.type==='arr'?'l\'arrivée':'le départ'}</button>`);horlogeMaj()}
Object.assign(ACT,{
 kqMode:d=>{const q=kq();q.mode=d.v;if(d.v==='choix'&&q.h==null){const n=new Date();q.date=today();q.mois=q.date.slice(0,7);q.h=n.getHours();q.m=n.getMinutes();q.pas='h'}S.kr?kqRecapMaj():horoRefresh()},
 kqJour:d=>{kq().date=d.v;S.kr?kqRecapMaj():horoRefresh()},
 kqMois:d=>{const q=kq(),[y,m]=q.mois.split('-').map(Number),n=new Date(y,m-1+(+d.v),1,12);q.mois=`${n.getFullYear()}-${p2(n.getMonth()+1)}`;S.kr?kqRecapMaj():horoRefresh()},
 kqPas:d=>{kq().pas=d.v;S.kr?kqRecapMaj():horoRefresh()},
 kqPlus:d=>{const q=kq(),t=at(q.date,`${p2(q.h??0)}:${p2(q.m??0)}`);t.setMinutes(t.getMinutes()+(+d.v));q.date=dkey(t);q.mois=q.date.slice(0,7);q.h=t.getHours();q.m=t.getMinutes();S.kr?kqRecapMaj():horoRefresh()},
 krType:d=>{S.kr.type=d.v;kqRecapMaj()},
 kpoint:d=>{const a=DB.agents.find(x=>x.mat===val('kmat').trim());if(!a)return toast('Matricule inconnu. Vérifiez la saisie.','err');
  if(S.profil.role==='agent'&&a.id!==S.profil.agentId)return toast('Vous ne pouvez pas pointer pour un autre agent.','err');
  if(a.serviceId!==S.kSvc)return toast(`Cette borne est celle du service ${svc(S.kSvc).nom}. Pointage refusé pour un agent d'un autre service.`,'err');
  if(val('kpin')!==a.pin){audit('Anomalie de pointage',`PIN erroné pour ${nomA(a)}`);save();return toast('Code PIN incorrect. La tentative est signalée au responsable.','err')}
  S.kr={agentId:a.id,type:d.t,motif:''};kqRecap()},
 kConf:()=>{const R=S.kr;if(!R)return closeModal();const a=ag(R.agentId),q=kq(),now=new Date(),decl=kqDecl(),m=document.getElementById('krMotif'),motif=m?m.value.trim():'';
  if(decl>new Date(now.getTime()+6e4))return toast('L\'heure choisie est dans le futur.','err');
  if(dkey(decl)<addDays(today(),-KQ_JOURS))return toast(`Une heure déclarée ne peut pas remonter à plus de ${KQ_JOURS} jours.`,'err');
  const declaree=q.mode==='choix'&&Math.abs(now-decl)/6e4>paramsFor(a.serviceId).saisieTardive;if(declaree&&!motif)return toast('Indiquez le motif de l\'heure déclarée.','err');
  const r=pointer(a.id,R.type,{mode:declaree?'declare':'borne',decl:q.mode==='choix'?decl:undefined,motif});if(!res(r))return;
  S.kr=null;S.kq=null;closeModal();const pin=document.getElementById('kpin');if(pin)pin.value='';render();if(S.profil.role!=='agent'){const k=document.getElementById('kmat');if(k)k.value=''}else kioskInfo()}
});
function kqRecapMaj(){const m=document.getElementById('krMotif');if(m&&S.kr)S.kr.motif=m.value;kqRecap()}
document.addEventListener('click',e=>{const g=e.target.closest('.cadran .cn');if(!g)return;const q=kq();if(g.dataset.h!=null){q.h=+g.dataset.h;q.pas='m'}else if(g.dataset.m!=null)q.m=+g.dataset.m;S.kr?kqRecapMaj():horoRefresh()});
document.addEventListener('change',e=>{if(e.target.id!=='kqTime'||!e.target.value)return;const[h,m]=e.target.value.split(':').map(Number);const q=kq();q.h=h;q.m=m;S.kr?kqRecapMaj():horoRefresh()});
