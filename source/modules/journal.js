/* ============ Journal de paie : affichage modernisé ============ */
const jpMt=v=>String(Math.round(+v||0)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
recapTSV=function(D){return[[...RECAPH,...D.cols.map(recapLab),...(D.autres?['Autres']:[]),'Brut','Retenues','Net à payer'],...D.rows.map(({a,b},i)=>[i+1,a.prenom+' '+a.nom,recapId(a),a.sexe||'',recapFonc(a),a.matrimoniale||'',a.enfants??'',a.classement||'',...D.cols.map(c=>montantRub(b,c.id)),...(D.autres?[autresRub(b,D.cid)]:[]),b.brut,b.retenues,b.net])]};
recapTotaux=function(){const D=S.recapD;if(!D)return'';const bs=D.rows.map(z=>bulletin(z.a,D.ym)),s=f=>bs.reduce((t,b)=>t+f(b),0);
 return`<td class="jp-s1"></td><td class="jp-s2"><b>TOTAL</b><div class="sub">${D.rows.length} agent(s)</div></td>${S.rem.jpId?'<td></td><td></td>':''}${D.cols.map(c=>`<td class="jp-n" data-l="${esc(recapLab(c))}"><b>${jpMt(s(b=>montantRub(b,c.id)))}</b></td>`).join('')}${D.autres?`<td class="jp-n" data-l="Autres"><b>${jpMt(s(b=>autresRub(b,D.cid)))}</b></td>`:''}<td class="jp-n jp-b" data-l="Brut"><b>${jpMt(s(b=>b.brut))}</b></td><td class="jp-n jp-r" data-l="Retenues"><b>${jpMt(s(b=>b.retenues))}</b></td><td class="jp-n jp-net" data-l="Net à payer"><b>${jpMt(s(b=>b.net))}</b></td><td class="jp-ec"></td>`};
recapPage=function(onglets){if(S.rem.jpq&&typeof document!=='undefined')setTimeout(jpFiltre,0);const D=S.recapD=recapDonnees(),T=today(),e=can('paieEdit');S.tsv=recapTSV(D);S.tsvNom='Journal_de_paie_'+D.ym;
 const bs=D.rows.map(z=>z.b),sm=f=>bs.reduce((t,b)=>t+f(b),0),nMod=bs.filter(b=>b.statut==='modifié').length,nArc=bs.filter(b=>b.statut==='archivé').length;
 const cell=(a,b,c)=>{const v=montantRub(b,c.id);return e&&b.statut!=='archivé'?`<input class="jp-in${v?'':' z'}" type="text" inputmode="numeric" value="${jpMt(v)}" data-chg="recap" data-id="${a.id}" data-r="${c.id}" aria-label="${esc(c.nom)} de ${esc(nomA(a))}">`:`<span class="${v?'':'jp-z'}">${jpMt(v)}</span>`};
 const sit=a=>[a.sexe==='F'?'Femme':a.sexe==='M'?'Homme':'',a.matrimoniale||'',a.enfants?`${a.enfants} enfant${a.enfants>1?'s':''}`:''].filter(Boolean).join(' · ');
 return`<div class="head"><div><h1>Rémunérations</h1><div class="sub">Journal de paie de ${moisLib(D.ym)} · ${D.rows.length} agent(s) · une cellule modifiée met à jour le bulletin de l'agent</div></div><span class="sp"></span>${svcSelect()}<input type="month" id="rm_m" data-chg="remM" value="${D.ym}" max="${T.slice(0,7)}" aria-label="Mois"><button class="btn v" data-act="remCsv">Exporter Excel</button><button class="btn v" data-act="recapPdf">Imprimer (PDF)</button>${e?arretBtn(D.ym):''}</div>${onglets}${paieBandeau(D.ym)}
 <div class="grid kpis">${[[jpMt(sm(b=>b.brut)),'Masse salariale brute (FCFA)'],[jpMt(sm(b=>b.retenues)),'Total des retenues (FCFA)'],[jpMt(sm(b=>b.net)),'Net à payer (FCFA)'],[`${nMod} modifié(s) · ${nArc} archivé(s)`,'Bulletins']].map(([v,l],i)=>`<div class="kpi" style="cursor:default"><b id="jpk${i}" style="font-size:${i===3?16:22}px${i===2?';color:#0f6b43':''}">${v}</b><span>${l}</span></div>`).join('')}</div>
 <div class="card jp-card"><div class="row" style="margin-bottom:10px;gap:10px"><label class="jp-q"><input id="jp_q" type="search" placeholder="Filtrer : nom, matricule, fonction…" data-chg="jpQ" value="${esc(S.rem.jpq||'')}" aria-label="Filtrer le journal"></label><label class="row" style="gap:6px;font-size:14px"><input type="checkbox" data-chg="jpId"${S.rem.jpId?' checked':''}> Afficher naissance et situation familiale</label><span class="sub jp-aide">${e?'Cliquez sur un montant, saisissez, puis Entrée ou Tab.':'Lecture seule.'}</span></div>
 <div class="jp-tw noexp"><table class="jp-tab"><thead><tr><th class="jp-s1">N°</th><th class="jp-s2">Agent</th>${S.rem.jpId?'<th>Né(e) le</th><th>Situation</th>':''}${D.cols.map(c=>`<th class="jp-n">${esc(recapLab(c))}</th>`).join('')}${D.autres?'<th class="jp-n">Autres</th>':''}<th class="jp-n jp-b">Brut</th><th class="jp-n jp-r">Retenues</th><th class="jp-n jp-net">Net à payer</th><th class="jp-ec">État</th></tr></thead><tbody>
 ${D.rows.map(({a,b},i)=>`<tr data-q="${esc(kNorm(`${a.prenom} ${a.nom} ${a.mat} ${recapFonc(a)} ${a.classement||''}`))}"><td class="jp-s1 sub">${i+1}</td><td class="jp-s2"><a href="#" class="jp-nom" data-act="agent" data-id="${a.id}">${esc(a.prenom+' '+a.nom)}</a><div class="sub">${esc(a.mat)} · ${esc(recapFonc(a))}${a.classement?' · '+esc(a.classement):''}</div><div class="jp-et">${etatBul(b)}</div></td>
 ${S.rem.jpId?`<td class="sub" data-l="Né(e) le">${a.naissance?dfr(a.naissance):'—'}${a.lieuNaissance?`<div>${esc(a.lieuNaissance)}</div>`:''}</td><td class="sub" data-l="Situation">${esc(sit(a))||'—'}</td>`:''}
 ${D.cols.map(c=>`<td class="jp-n" data-l="${esc(recapLab(c))}">${cell(a,b,c)}</td>`).join('')}${D.autres?`<td class="jp-n" data-l="Autres">${jpMt(autresRub(b,D.cid))}</td>`:''}<td class="jp-n jp-b" data-l="Brut"><b id="rcb_${a.id}">${jpMt(b.brut)}</b></td><td class="jp-n jp-r" data-l="Retenues" id="rcr_${a.id}">${jpMt(b.retenues)}</td><td class="jp-n jp-net" data-l="Net à payer"><b id="rcn_${a.id}">${jpMt(b.net)}</b></td><td class="jp-ec" id="rce_${a.id}">${etatBul(b)}</td></tr>`).join('')}
 </tbody><tfoot><tr id="rc_tot">${recapTotaux()}</tr></tfoot></table></div>
 <div class="sub" style="margin-top:10px">${e?'Le bulletin de l\'agent passe à l\'état « modifié » et la modification est inscrite au suivi des modifications ; les retenues légales sont recalculées. ':''}Les lignes archivées ne sont plus modifiables. Pour un changement durable, utilisez plutôt l'onglet « Rubriques et grilles ».</div></div>`};
CHG.recap=el=>{const a=ag(el.dataset.id),ym=S.rem.ym,v=Math.max(0,Math.round(+String(el.value).replace(/[^\d]/g,'')||0)),r=setMontant(a,ym,el.dataset.r,v);if(!r.ok){toast(r.msg,'err');return render()}
 const b=bulletin(a,ym),$i=id=>document.getElementById(id);el.value=jpMt(v);el.classList.toggle('z',!v);
 if($i('rcb_'+a.id))$i('rcb_'+a.id).textContent=jpMt(b.brut);if($i('rcr_'+a.id))$i('rcr_'+a.id).textContent=jpMt(b.retenues);if($i('rcn_'+a.id))$i('rcn_'+a.id).textContent=jpMt(b.net);if($i('rce_'+a.id))$i('rce_'+a.id).innerHTML=etatBul(b);{const et=el.closest('tr')&&el.closest('tr').querySelector('.jp-et');if(et)et.innerHTML=etatBul(b)}if($i('rc_tot'))$i('rc_tot').innerHTML=recapTotaux();
 const B=S.recapD.rows.map(z=>bulletin(z.a,ym)),sm=f=>B.reduce((x,y)=>x+f(y),0),K=[jpMt(sm(x=>x.brut)),jpMt(sm(x=>x.retenues)),jpMt(sm(x=>x.net)),`${B.filter(x=>x.statut==='modifié').length} modifié(s) · ${B.filter(x=>x.statut==='archivé').length} archivé(s)`];K.forEach((v,i)=>{const k=$i('jpk'+i);if(k)k.textContent=v});
 const tr=el.closest('tr');if(tr){tr.classList.remove('jp-ok');void tr.offsetWidth;tr.classList.add('jp-ok')}};
CHG.jpId=el=>{S.rem.jpId=el.checked;render()};
CHG.jpQ=el=>{S.rem.jpq=el.value;jpFiltre()};
const jpFiltre=()=>{const q=kNorm(S.rem.jpq||'');document.querySelectorAll('.jp-tab tbody tr').forEach(tr=>{tr.style.display=!q||tr.dataset.q.includes(q)?'':'none'})};
if(typeof document!=='undefined'){document.addEventListener('input',ev=>{if(ev.target&&ev.target.id==='jp_q'){S.rem.jpq=ev.target.value;jpFiltre()}});
 document.addEventListener('focusin',ev=>{const t=ev.target;if(t&&t.classList&&t.classList.contains('jp-in')){t.select();t.addEventListener('mouseup',e=>e.preventDefault(),{once:true})}});
 document.addEventListener('keydown',ev=>{const t=ev.target;if(t&&t.classList&&t.classList.contains('jp-in')&&ev.key==='Enter'){ev.preventDefault();t.blur()}});
 const st=document.createElement('style');st.textContent=`
.jp-card{padding-top:14px}.jp-q{flex:1;min-width:220px;max-width:420px}.jp-q input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line,#dfe5ee);font:inherit;font-size:15px}
.jp-tw{border:1px solid var(--line,#e4e9f1);border-radius:12px;overflow:hidden}
.jp-tab{border-collapse:separate;border-spacing:0;width:100%;table-layout:auto;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.35;font-variant-numeric:tabular-nums;color:#1b2a41}
.jp-tab th{background:#f4f7fb;font-size:12.5px;font-weight:650;text-transform:none;letter-spacing:0;color:#46566d;padding:10px 6px;border-bottom:1px solid var(--line,#e4e9f1);white-space:normal;vertical-align:bottom;line-height:1.2}
.jp-tab td{padding:7px 6px;border-bottom:1px solid #eef2f7;vertical-align:middle;background:#fff}
.jp-tab tbody tr:hover td{background:#f7faff}
.jp-tab .jp-s1{width:28px;text-align:center;color:#8a96a8;font-size:12.5px}
.jp-tab .jp-s2{min-width:170px}
.jp-tab .jp-s2 .sub{font-size:12px;line-height:1.3;margin-top:2px;color:#6b7a90}
.jp-et{display:none}
.jp-nom{font-weight:650;font-size:14.5px;color:var(--bleu,#1d4ed8);text-decoration:none}.jp-nom:hover{text-decoration:underline}
.jp-n{text-align:right;white-space:nowrap}
.jp-tab th.jp-n{text-align:right;max-width:92px}
.jp-in{width:100%;min-width:62px;max-width:92px;box-sizing:border-box;text-align:right;padding:6px 7px;border:1px solid #e3e9f2;border-radius:8px;background:#f8fafd;font:inherit;font-size:14px;font-weight:600;color:#1b2a41;font-variant-numeric:tabular-nums;transition:border-color .15s,background .15s,box-shadow .15s}
.jp-in:hover{border-color:#b9c9e0;background:#fff}.jp-in:focus{outline:none;border-color:var(--bleu,#2563eb);background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.jp-in.z,.jp-z{color:#a3adbb;font-weight:500}
.jp-tab td.jp-b{background:#f4f8ff;font-size:14.5px}.jp-tab td.jp-r{color:#c0392b;font-weight:600}.jp-tab td.jp-net{background:#effaf4;color:#0f6b43;font-size:14.5px}
.jp-tab th.jp-b{background:#e9f1fd}.jp-tab th.jp-net{background:#e3f5ea}
.jp-tab td.jp-ec .pill{font-size:11.5px;padding:3px 8px}
.jp-tab tfoot td{background:#eaf1fb;border-top:2px solid #c9d8ee;font-size:14px}
.jp-tab tr.jp-ok td{animation:jpok 1.2s ease}@keyframes jpok{0%{background:#dff5e8}100%{}}
@media(max-width:1280px){.jp-tab .jp-ec{display:none}.jp-et{display:block;margin-top:3px}.jp-tab{font-size:13.5px}.jp-tab th{font-size:12px;padding:9px 4px}.jp-tab td{padding:6px 4px}.jp-in{max-width:84px;padding:5px 6px;font-size:13.5px}.jp-tab .jp-s2{min-width:150px}}
/* Tablette et smartphone : une carte par agent */
@media(max-width:1100px){
 .jp-tw{border:0;overflow:visible}.jp-tab,.jp-tab tbody,.jp-tab tfoot{display:block;width:100%}.jp-tab thead{display:none}
 .jp-tab tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px 10px;padding:12px 14px;margin:0 0 12px;border:1px solid #e2e8f1;border-radius:14px;background:#fff;box-shadow:0 2px 6px rgba(15,35,70,.05)}
 .jp-tab tbody tr:hover td{background:transparent}
 .jp-tab td{display:flex;flex-direction:column;gap:3px;border:0;padding:0;background:transparent!important;text-align:left;white-space:normal}
 .jp-tab td[data-l]::before{content:attr(data-l);font-size:12px;font-weight:600;color:#6b7a90}
 .jp-tab td.jp-s1{display:none}.jp-tab td.jp-s2{grid-column:1/-1;padding-bottom:6px;border-bottom:1px solid #eef2f7}
 .jp-et{display:block;margin-top:6px}.jp-tab td.jp-ec{display:none}
 .jp-in{max-width:none;width:100%;font-size:16px;padding:9px 10px}
 .jp-tab td.jp-b,.jp-tab td.jp-r,.jp-tab td.jp-net{border-radius:10px;padding:8px 10px;font-size:16px}
 .jp-tab td.jp-b{background:#f1f6ff!important}.jp-tab td.jp-net{background:#eaf8f0!important}.jp-tab td.jp-r{background:#fdf2f1!important}
 .jp-tab tfoot tr{background:#eaf1fb;border-color:#c9d8ee}.jp-tab tfoot td{border:0;background:transparent}
 .jp-aide{display:none}
}
@media(max-width:520px){.jp-tab tr{grid-template-columns:1fr 1fr;padding:12px}.jp-nom{font-size:16px}}
`;document.head&&document.head.appendChild(st)}
