/* ============ Fiche de rémunération : choisir un bulletin par année et par mois ============ */
function bulMoisBar(a,ym){const T=today().slice(0,7),Y=+ym.slice(0,4),y0=Math.min(Y,Math.max(+(a.entree||T).slice(0,4),+T.slice(0,4)-10)),ans=[];for(let y=+T.slice(0,4);y>=y0;y--)ans.push(y);
 const ms=moisAnnee(String(Y));
 return`<div class="card bmb"><div class="row" style="gap:10px;margin-bottom:10px"><b>Rechercher un bulletin</b><label class="row" style="gap:6px"><span class="sub">Année</span><select data-chg="bulAn" aria-label="Année">${ans.map(y=>`<option${y===Y?' selected':''}>${y}</option>`).join('')}</select></label><span class="sub">puis cliquez sur le mois</span></div>
 <div class="bmg">${ms.map(m=>{const fut=m>T,b=fut?null:bulletin(a,m),k=m===ym?' on':'';return`<button class="bmm${k}${fut||!b.brut?' vide':''}" data-act="bulMois" data-m="${m}"${fut?' disabled':''} title="${esc(moisLib(m))}"><b>${MOIS[+m.slice(5)-1]}</b><span>${fut?'—':b.brut?num(b.net):'aucun'}</span>${!fut&&b.brut?`<i class="${b.statut==='archivé'?'d':'p'}">${b.statut==='archivé'?'définitif':b.statut==='modifié'?'modifié':'provisoire'}</i>`:''}</button>`}).join('')}</div></div>`}
Object.assign(CHG,{bulAn:el=>{const m=S.rem.ym.slice(5,7),T=today().slice(0,7);let v=`${el.value}-${m}`;if(v>T)v=T;S.rem.ym=v;render()}});
Object.assign(ACT,{bulMois:d=>{S.rem.ym=d.m;render()}});
if(typeof document!=='undefined'){const st=document.createElement('style');st.textContent=`.bmg{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px}
.bmm{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px;border:1px solid var(--bord);border-radius:12px;background:#fff;cursor:pointer;font:inherit;color:var(--encre);min-width:0}
.bmm b{font-size:13px;text-transform:capitalize}.bmm span{font-size:11.5px;color:var(--gris);font-variant-numeric:tabular-nums;white-space:nowrap}.bmm i{font-style:normal;font-size:10px;font-weight:700;border-radius:8px;padding:0 6px}
.bmm i.d{background:var(--vert-pale);color:#0c6447}.bmm i.p{background:var(--warn-pale);color:#7a4700}.bmm:hover:not(:disabled){border-color:var(--bleu);background:var(--bleu-pale)}
.bmm.on{border-color:var(--bleu);background:var(--bleu);color:#fff}.bmm.on span{color:#dbe7ff}.bmm.vide span{color:#a3adbb}.bmm:disabled{opacity:.45;cursor:default}
@media(max-width:1000px){.bmg{grid-template-columns:repeat(6,minmax(0,1fr))}}@media(max-width:520px){.bmg{grid-template-columns:repeat(4,minmax(0,1fr))}}`;document.head&&document.head.appendChild(st)}
