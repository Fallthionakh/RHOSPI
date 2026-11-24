const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(process.argv[2],'utf8');
const js=html.match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={console,Math,Date,JSON,Map,Set,String,Array,Object,parseInt,setTimeout,clearTimeout};
vm.createContext(ctx);
vm.runInContext(js+`
;globalThis.T=function(){
 const out=[];const ok=(n,c)=>out.push((c?'OK  ':'FAIL ')+n);
 const now=new Date('2026-11-16T10:05:00');DB=seed(now);index();S.profil={role:'superadmin'};
 const ids=DB.services.map(s=>s.id);const J=jour('2026-11-16',ids,now);
 out.push('agents '+DB.agents.length+' pointages '+DB.pointages.length+' attendus '+J.attendus.length+' presents '+J.presents.length+' retards '+J.retards.length+' absents '+J.absents.length+' conges '+J.conges.length+' taux '+J.taux);
 out.push('alertes '+alertes(ids,now).length+' : '+alertes(ids,now).slice(0,5).map(a=>a.type).join(' | '));
 // garde de nuit traversant minuit
 const a=DB.agents[3].id;DB.pointages=DB.pointages.filter(p=>p.agentId!==a);DB.absences=DB.absences.filter(x=>x.agentId!==a);
 DB.planning[a+'|2026-11-15']='N';DB.planning[a+'|2026-11-16']='R';
 DB.pointages.push({id:'x',agentId:a,date:'2026-11-15',arr:new Date('2026-11-15T16:05:00').toISOString(),dep:new Date('2026-11-16T08:02:00').toISOString()});index();
 let r=etat(a,'2026-11-15',now);ok('nuit: présent, 0 retard (tolérance)',r.statut==='present'&&r.retard===0);ok('nuit: 957 min de présence',Math.round(r.presence)===957);ok('nuit: 960 min programmées',r.prog===960);
 ok('lendemain repos, pas absent',etat(a,'2026-11-16',now).statut==='repos');
 // retard au-delà de la tolérance, compté une seule fois
 DB.pointages.find(p=>p.id==='x').arr=new Date('2026-11-15T16:25:00').toISOString();r=etat(a,'2026-11-15',now);ok('retard 25 min',r.statut==='retard'&&r.retard===25);
 // départ anticipé
 DB.pointages.find(p=>p.id==='x').arr=new Date('2026-11-15T16:00:00').toISOString();DB.pointages.find(p=>p.id==='x').dep=new Date('2026-11-16T07:00:00').toISOString();r=etat(a,'2026-11-15',now);ok('départ anticipé 60',r.statut==='depart_anticipe'&&r.anticipe===60);
 // pointage incomplet / en cours
 delete DB.pointages.find(p=>p.id==='x').dep;ok('incomplet après délai',etat(a,'2026-11-15',now).statut==='incomplet');ok('en cours avant fin',etat(a,'2026-11-15',new Date('2026-11-16T03:00:00')).statut==='present');
 // absent présumé / attendu
 DB.pointages=DB.pointages.filter(p=>p.id!=='x');index();DB.planning[a+'|2026-11-16']='J';
 ok('attendu avant délai',etat(a,'2026-11-16',new Date('2026-11-16T08:20:00')).statut==='attendu');ok('absent présumé après délai',etat(a,'2026-11-16',now).statut==='absent_presume');
 // congé approuvé prime
 DB.absences.push({id:'ab',agentId:a,type:'Congé annuel',debut:'2026-11-16',fin:'2026-11-18',statut:'approuvée',motif:'t'});ok('congé non compté absent',etat(a,'2026-11-16',now).statut==='conge');
 const c=absCalc(DB.absences.find(x=>x.id==='ab'));ok('absence 3 jours calendaires',c.j===3);
 // bilan : pas de division fausse
 const B=bilan(DB.agents[10].id,'2026-10-18','2026-11-16',now);out.push('bilan '+JSON.stringify({p:B.jProg,pr:B.jPres,r:B.nRet,nj:B.jAbsNJ,t:B.taux}));ok('taux <= 1',B.taux<=1);
 // mouvement clôture l'affectation
 const m=DB.agents[12];const n0=DB.affectations.length;const res=mouvement(m.id,'LAB','INF','2026-11-16','Besoin de service','NS-12');ok('mouvement ok',res.ok&&DB.affectations.length===n0+1&&DB.affectations.filter(x=>x.agentId===m.id&&!x.fin).length===1&&m.serviceId==='LAB');
 // doublon de pointage (heure réelle)
 const real=new Date(),rt=dkey(real);const b=DB.agents[1].id;DB.pointages=DB.pointages.filter(p=>p.agentId!==b);DB.absences=DB.absences.filter(x=>x.agentId!==b);DB.planning[b+'|'+rt]='G';DB.planning[b+'|'+addDays(rt,-1)]='R';index();
 ok('arrivée ok',pointer(b,'arr',{mode:'borne'}).ok);ok('doublon refusé',!pointer(b,'arr',{mode:'borne'}).ok);ok('départ avant arrivée refusé',!pointer(b,'dep',{mode:'manuel',decl:new Date(real.getTime()-36e5)}).ok);
 ok('départ ok',pointer(b,'dep',{mode:'borne',decl:new Date(real.getTime()+1000)}).ok);ok('second départ refusé',!pointer(b,'dep',{mode:'borne'}).ok);
 const pid=PIX.get(b+'|'+rt).id;ok('correction sans motif refusée',!corriger(pid,new Date().toISOString(),'','').ok);ok('correction tracée',corriger(pid,new Date(real.getTime()-6e5).toISOString(),'','erreur de saisie').ok&&DB.corrections.length===1&&!!DB.corrections[0].avant.arr);
 ok('audit alimenté',DB.audit.length>=4);
 return out.join('\\n');
}`,ctx);
console.log(ctx.T());
