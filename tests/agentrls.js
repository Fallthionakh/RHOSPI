const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync('../pointview/index.html','utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const el=()=>({innerHTML:'',value:'',style:{},dataset:{},checked:false});
const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},createElement:el,body:{appendChild(){}}}};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){toast=()=>{};let D=seed(new Date());const inf=D.agents.find(a=>a.serviceId==='URG'&&a.posteId==='INF').id;
const SENS=['a:agents','a:pointages','a:absences','a:demandes','a:decisions','m:bulletins','a:journalPaie','a:pec','a:sante','a:audit','a:corrections','a:documents','a:affectations','a:formations'];
const rows=[...clRows(D)].map(([k,j])=>{const i=k.indexOf('\\u0001');return[k.slice(0,i),k.slice(i+1),JSON.parse(j)]}).filter(([c,id,d])=>!SENS.includes(c)||(c==='a:agents'&&id===inf)||(d&&d.agentId===inf)||(c==='m:bulletins'&&id.split('|')[0]===inf));
DB={};CL={pend:new Map(),last:new Map()};clLot(rows.map(r=>[r[0],r[1],r[2],false]));migrate(DB);index();S.profil={id:'moi',role:'agent',agentId:inf};const out=[];
for(const p of ROLES.agent.menu){S.page=p;try{const h=(PAGES[p])();out.push(p+' OK '+(h.includes('undefined')?'(undefined!)':''))}catch(e){out.push(p+' ERREUR '+e.message)}}
S.agentId=inf;try{PAGES.agent();out.push('fiche OK')}catch(e){out.push('fiche ERREUR '+e.stack.split('\\n').slice(0,3).join(' | '))}
try{alertes(scope());out.push('alertes OK')}catch(e){out.push('alertes ERREUR '+e.message)}
return 'agents visibles '+DB.agents.length+'\\n'+out.join('\\n')}`,ctx);console.log(ctx.T());
