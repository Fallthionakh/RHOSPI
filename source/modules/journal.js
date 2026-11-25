/* ============ Journal de paie : affichage modernisé ============ */
const jpMt=v=>String(Math.round(+v||0)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
recapTSV=function(D){return[[...RECAPH,...D.cols.map(recapLab),...(D.autres?['Autres']:[]),'Brut','Retenues','Net à payer'],...D.rows.map(({a,b},i)=>[i+1,a.prenom+' '+a.nom,recapId(a),a.sexe||'',recapFonc(a),a.matrimoniale||'',a.enfants??'',a.classement||'',...D.cols.map(c=>montantRub(b,c.id)),...(D.autres?[autresRub(b,D.cid)]:[]),b.brut,b.retenues,b.net])]};
recapTotaux=function(){const D=S.recapD;if(!D)return'';const bs=D.rows.map(z=>bulletin(z.a,D.ym)),s=f=>bs.reduce((t,b)=>t+f(b),0);
 return`<td class="jp-s1"></td><td class="jp-s2"><b>TOTAL</b><div class="sub">${D.rows.length} agent(s)</div></td><td></td><td></td>${D.cols.map(c=>`<td class="jp-n"><b>${jpMt(s(b=>montantRub(b,c.id)))}</b></td>`).join('')}${D.autres?`<td class="jp-n"><b>${jpMt(s(b=>autresRub(b,D.cid)))}</b></td>`:''}<td class="jp-n jp-b"><b>${jpMt(s(b=>b.brut))}</b></td><td class="jp-n jp-r"><b>${jpMt(s(b=>b.retenues))}</b></td><td class="jp-n jp-net"><b>${jpMt(s(b=>b.net))}</b></td><td></td>`};
recapPage=function(onglets){if(S.rem.jpq&&typeof document!=='undefined')setTimeout(jpFiltre,0);const D=S.recapD=recapDonnees(),T=today(),e=can('paieEdit');S.tsv=recapTSV(D);S.tsvNom='Journal_de_paie_'+D.ym;
 const bs=D.rows.map(z=>z.b),sm=f=>bs.reduce((t,b)=>t+f(b),0),nMod=bs.filter(b=>b.statut==='modifié').length,nArc=bs.filter(b=>b.statut==='archivé').length;
 const cell=(a,b,c)=>{const v=montantRub(b,c.id);return e&&b.statut!=='archivé'?`<input class="jp-in${v?'':' z'}" type="text" inputmode="numeric" value="${jpMt(v)}" data-chg="recap" data-id="${a.id}" data-r="${c.id}" aria-label="${esc(c.nom)} de ${esc(nomA(a))}">`:`<span class="${v?'':'jp-z'}">${jpMt(v)}</span>`};
 const sit=a=>[a.sexe==='F'?'Femme':a.sexe==='M'?'Homme':'',a.matrimoniale||'',a.enfants?`${a.enfants} enfant${a.enfants>1?'s':''}`:''].filter(Boolean).join(' · ');
 return`<div class="head"><div><h1>Rémunérations</h1><div class="sub">Journal de paie de ${moisLib(D.ym)} · ${D.rows.length} agent(s) · une cellule modifiée met à jour le bulletin de l'agent</div></div><span class="sp"></span>${svcSelect()}<input type="month" id="rm_m" data-chg="remM" value="${D.ym}" max="${T.slice(0,7)}" aria-label="Mois"><button class="btn v" data-act="remCsv">Exporter Excel</button><button class="btn v" data-act="recapPdf">Imprimer (PDF)</button>${e?arretBtn(D.ym):''}</div>${onglets}${paieBandeau(D.ym)}
 <div class="grid kpis">${[[jpMt(sm(b=>b.brut)),'Masse salariale brute (FCFA)'],[jpMt(sm(b=>b.retenues)),'Total des retenues (FCFA)'],[jpMt(sm(b=>b.net)),'Net à payer (FCFA)'],[`${nMod} modifié(s) · ${nArc} archivé(s)`,'Bulletins']].map(([v,l],i)=>`<div class="kpi" style="cursor:default"><b id="jpk${i}" style="font-size:${i===3?16:22}px${i===2?';color:#0f6b43':''}">${v}</b><span>${l}</span></div>`).join('')}</div>
 <div class="card jp-card"><div class="row" style="margin-bottom:10px;gap:10px"><label class="jp-q"><input id="jp_q" type="search" placeholder="Filtrer : nom, matricule, fonction…" data-chg="jpQ" value="${esc(S.rem.jpq||'')}" aria-label="Filtrer le journal"></label><span class="sub">${e?'Cliquez sur un montant, saisissez, puis Entrée ou Tab.':'Lecture seule.'}</span></div>
 <div class="tw jp-tw"><table class="jp-tab"><thead><tr><th class="jp-s1">N°</th><th class="jp-s2">Agent</th><th>Né(e) le</th><th>Situation</th>${D.cols.map(c=>`<th class="jp-n">${esc(recapLab(c))}</th>`).join('')}${D.autres?'<th class="jp-n">Autres</th>':''}<th class="jp-n jp-b">Brut</th><th class="jp-n jp-r">Retenues</th><th class="jp-n jp-net">Net à payer</th><th>État</th></tr></thead><tbody>
 ${D.rows.map(({a,b},i)=>`<tr data-q="${esc(kNorm(`${a.prenom} ${a.nom} ${a.mat} ${recapFonc(a)} ${a.classement||''}`))}"><td class="jp-s1 sub">${i+1}</td><td class="jp-s2"><a href="#" class="jp-nom" data-act="agent" data-id="${a.id}">${esc(a.prenom+' '+a.nom)}</a><div class="sub">${esc(a.mat)} · ${esc(recapFonc(a))}${a.classement?' · '+esc(a.classement):''}</div></td>
 <td class="sub" style="white-space:nowrap">${a.naissance?dfr(a.naissance):'—'}${a.lieuNaissance?`<div>${esc(a.lieuNaissance)}</div>`:''}</td><td class="sub">${esc(sit(a))||'—'}</td>
 ${D.cols.map(c=>`<td class="jp-n">${cell(a,b,c)}</td>`).join('')}${D.autres?`<td class="jp-n">${jpMt(autresRub(b,D.cid))}</td>`:''}<td class="jp-n jp-b"><b id="rcb_${a.id}">${jpMt(b.brut)}</b></td><td class="jp-n jp-r" id="rcr_${a.id}">${jpMt(b.retenues)}</td><td class="jp-n jp-net"><b id="rcn_${a.id}">${jpMt(b.net)}</b></td><td id="rce_${a.id}">${etatBul(b)}</td></tr>`).join('')}
 </tbody><tfoot><tr id="rc_tot">${recapTotaux()}</tr></tfoot></table></div>
 <div class="sub" style="margin-top:10px">${e?'Le bulletin de l\'agent passe à l\'état « modifié » et la modification est inscrite au suivi des modifications ; les retenues légales sont recalculées. ':''}Les lignes archivées ne sont plus modifiables. Pour un changement durable, utilisez plutôt l'onglet « Rubriques et grilles ».</div></div>`};
CHG.recap=el=>{const a=ag(el.dataset.id),ym=S.rem.ym,v=Math.max(0,Math.round(+String(el.value).replace(/[^\d]/g,'')||0)),r=setMontant(a,ym,el.dataset.r,v);if(!r.ok){toast(r.msg,'err');return render()}
 const b=bulletin(a,ym),$i=id=>document.getElementById(id);el.value=jpMt(v);el.classList.toggle('z',!v);
 if($i('rcb_'+a.id))$i('rcb_'+a.id).textContent=jpMt(b.brut);if($i('rcr_'+a.id))$i('rcr_'+a.id).textContent=jpMt(b.retenues);if($i('rcn_'+a.id))$i('rcn_'+a.id).textContent=jpMt(b.net);if($i('rce_'+a.id))$i('rce_'+a.id).innerHTML=etatBul(b);if($i('rc_tot'))$i('rc_tot').innerHTML=recapTotaux();
 const B=S.recapD.rows.map(z=>bulletin(z.a,ym)),sm=f=>B.reduce((x,y)=>x+f(y),0),K=[jpMt(sm(x=>x.brut)),jpMt(sm(x=>x.retenues)),jpMt(sm(x=>x.net)),`${B.filter(x=>x.statut==='modifié').length} modifié(s) · ${B.filter(x=>x.statut==='archivé').length} archivé(s)`];K.forEach((v,i)=>{const k=$i('jpk'+i);if(k)k.textContent=v});
 const tr=el.closest('tr');if(tr){tr.classList.remove('jp-ok');void tr.offsetWidth;tr.classList.add('jp-ok')}};
CHG.jpQ=el=>{S.rem.jpq=el.value;jpFiltre()};
const jpFiltre=()=>{const q=kNorm(S.rem.jpq||'');document.querySelectorAll('.jp-tab tbody tr').forEach(tr=>{tr.style.display=!q||tr.dataset.q.includes(q)?'':'none'})};
if(typeof document!=='undefined'){document.addEventListener('input',ev=>{if(ev.target&&ev.target.id==='jp_q'){S.rem.jpq=ev.target.value;jpFiltre()}});
 document.addEventListener('focusin',ev=>{const t=ev.target;if(t&&t.classList&&t.classList.contains('jp-in')){t.select();t.addEventListener('mouseup',e=>e.preventDefault(),{once:true})}});
 document.addEventListener('keydown',ev=>{const t=ev.target;if(t&&t.classList&&t.classList.contains('jp-in')&&ev.key==='Enter'){ev.preventDefault();t.blur()}});
 const st=document.createElement('style');st.textContent=`
.jp-card{padding-top:14px}.jp-q{flex:1;max-width:420px}.jp-q input{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--line,#dfe5ee);font:inherit}
.jp-tw{max-height:70vh;overflow:auto;border:1px solid var(--line,#e4e9f1);border-radius:12px}
.jp-tab{border-collapse:separate;border-spacing:0;min-width:max-content;width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}
.jp-tab th{position:sticky;top:0;z-index:2;background:#f4f7fb;white-space:nowrap;font-size:11px;letter-spacing:.04em;padding:10px 10px;border-bottom:1px solid var(--line,#e4e9f1)}
.jp-tab td{padding:8px 10px;border-bottom:1px solid #eef2f7;vertical-align:middle;background:var(--card,#fff)}
.jp-tab tbody tr:hover td{background:#f7faff}
.jp-tab .jp-s1{position:sticky;left:0;z-index:1;width:38px;min-width:38px;text-align:center}
.jp-tab .jp-s2{position:sticky;left:38px;z-index:1;min-width:210px;max-width:260px;box-shadow:6px 0 8px -6px rgba(15,35,70,.18)}
.jp-tab th.jp-s1,.jp-tab th.jp-s2{z-index:3}
.jp-tab .jp-s2 .sub{font-size:11.5px;white-space:normal;line-height:1.3;margin-top:2px}
.jp-nom{font-weight:650;color:var(--bleu,#1d4ed8);text-decoration:none}.jp-nom:hover{text-decoration:underline}
.jp-n{text-align:right;white-space:nowrap}
.jp-in{width:96px;text-align:right;padding:6px 8px;border:1px solid transparent;border-radius:8px;background:#f3f6fa;font:inherit;font-weight:550;color:inherit;font-variant-numeric:tabular-nums;transition:border-color .15s,background .15s,box-shadow .15s}
.jp-in:hover{border-color:#c9d6e8;background:#fff}.jp-in:focus{outline:none;border-color:var(--bleu,#2563eb);background:#fff;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
.jp-in.z,.jp-z{color:#a3adbb;font-weight:400}
.jp-tab td.jp-b{background:#f4f8ff}.jp-tab td.jp-r{color:var(--crit,#c0392b)}.jp-tab td.jp-net{background:#effaf4;color:#0f6b43}
.jp-tab tfoot td{position:sticky;bottom:0;background:#eaf1fb;border-top:2px solid #c9d8ee;font-size:13.5px}
.jp-tab tfoot td.jp-s1,.jp-tab tfoot td.jp-s2{z-index:3}
.jp-tab tr.jp-ok td{animation:jpok 1.2s ease}@keyframes jpok{0%{background:#dff5e8}100%{}}
@media(max-width:700px){.jp-tab .jp-s2{min-width:150px}.jp-tw{max-height:none}}`;document.head&&document.head.appendChild(st)}
