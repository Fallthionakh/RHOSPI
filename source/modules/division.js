/* ============ Fiche de poste : division, unité et poste occupé ============ */
ADDK.division={t:'Nouvelle division'};ADDK.unite={t:'Nouvelle unité'};
const POSTES_OCC=['Major','Surveillant de service','Chef de service','Agent de service',"Chef d'unité",'Chef de division'];
const migrateDV=migrate;
migrate=function(db){migrateDV(db);const L=db.listes;L.divisions=L.divisions||[];L.unites=L.unites||[];
 db.fonctions=db.fonctions||[];POSTES_OCC.forEach(n=>{if(!db.fonctions.some(f=>(f.nom||'').toLowerCase()===n.toLowerCase()))db.fonctions.push({id:'F'+Math.random().toString(36).slice(2,8),nom:n})});return db};
const posteOccF=EDIT.posteOcc.f;
EDIT.posteOcc.f=x=>{const f=posteOccF(x),i=f.findIndex(z=>z[0]==='origine'),ord=POSTES_OCC.map(n=>DB.fonctions.find(z=>z.nom===n)).filter(Boolean),reste=DB.fonctions.filter(z=>!ord.includes(z));
 f.splice(i<0?f.length:i+1,0,['division','Division','select',[['','—'],...DB.listes.divisions.map(z=>[z,z])],'division'],['unite','Unité','select',[['','—'],...DB.listes.unites.map(z=>[z,z])],'unite'],
  ['fonctionId','Poste occupé','select',[...ord,...reste].map(z=>[z.id,z.nom]),'fonc']);return f};
/* Le poste occupé corrigé ici met aussi à jour l'affectation en cours */
ACT.editOk=(g=>function(d){const x=d.k==='posteOcc'?ag(d.id):null,av=x&&x.fonctionId;const r=g.apply(this,arguments);
 if(x&&x.fonctionId!==av){const af=DB.affectations.filter(z=>z.agentId===x.id&&!z.fin).sort((p,q)=>String(q.debut).localeCompare(String(p.debut)))[0];if(af)af.fonctionId=x.fonctionId;save();render()}return r})(ACT.editOk);
