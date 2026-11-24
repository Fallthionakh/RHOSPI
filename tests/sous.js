const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync(process.argv[2],'utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const el=()=>({innerHTML:'',value:'',style:{},dataset:{},checked:false});
const RD=Date,FIX=new RD(2026,10,17,23,7).getTime();
class FD extends RD{constructor(...a){a.length?super(...a):super(FIX)}static now(){return FIX}}
const ctx={Date:FD,console,setTimeout,clearTimeout,setInterval:()=>0,fs,Buffer,document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},createElement:el,body:{appendChild(){}}}};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){toast=function(){};render=function(){};DB=seed(new Date(2026,10,10,9));index();S.profil={role:'superadmin'};
const out=[];['URG','MAT'].forEach(id=>{const sv=svc(id),e=effectifService(sv);out.push(sv.nom+' min '+sv.min+' prog '+e.programmes.length+' pres '+e.presents.length);
e.programmes.forEach(r=>out.push('  '+nomA(ag(r.agentId))+' '+r.date+' '+r.vac.code+' '+hm(r.s)+'-'+hm(r.e)+' '+r.statut+' p='+JSON.stringify(r.p&&{arr:r.p.arr,dep:r.p.dep,abs:r.p.absent})))});
['MAT','URG'].forEach(id=>effectifService(svc(id)).programmes.forEach(r=>out.push('pointer '+JSON.stringify(pointer(r.agentId,'arr',{mode:'manuel',decl:at(today(),'16:05')})))));['URG','MAT'].forEach(id=>{const e=effectifService(svc(id));out.push(id+' après: prog '+e.programmes.length+' pres '+e.presents.length)});out.push(String(alertes(DB.services.map(s=>s.id)).filter(a=>a.type==='Sous-effectif').map(a=>a.texte).join('\\n')));
return out.join('\\n')}`,ctx);console.log(ctx.T());
