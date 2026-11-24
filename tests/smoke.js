const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync(process.argv[2],'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={console,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){DB=seed(new Date());index();let n=0;
for(const p of profils()){S.profil=p;S.svc='all';S.kSvc=null;S.agentId=DB.agents[0].id;
 for(const k of [...ROLES[p.role].menu,'agent',...(ROLES[p.role].menu.includes('agents')?['export']:[])]){for(const tab of ['tableau','borne']){S.tab=tab;const h=PAGES[k]();if(typeof h!=='string'||h.includes('undefined')||h.includes('NaN'))throw new Error(p.id+' '+k+' '+(h.match(/.{60}(undefined|NaN).{40}/)||[h.slice(0,80)])[0]);n++}}
 S.rap.agentId=DB.agents.find(a=>scope().includes(a.serviceId)).id;if(ROLES[p.role].menu.includes('rapports'))PAGES.rapports();S.rap.agentId=''}
return n+' pages rendues sans erreur'}`,ctx);console.log(ctx.T());
