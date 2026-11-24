// Faux Supabase minimal pour tester la synchronisation de SENHOP RH
const http=require('http');
const docs=new Map();let clock=Date.parse('2026-11-22T09:00:00Z');const tick=()=>new Date(++clock).toISOString().replace('Z','+00:00');
const users={'admin@x.sn':{id:'u1',pw:'motdepasse1'},'major@x.sn':{id:'u2',pw:'motdepasse2'}};
const membres=[{user_id:'u1',org_id:'thies',role:'superadmin',agent_id:null,nom:'Admin Test',email:'admin@x.sn',actif:true}];
const orgs={thies:'Hôpital Régional de Thiès'};const files=new Map();let pushes=0,pulls=0,rowsPushed=0;
const tok=u=>'tok-'+u;const uidOf=req=>{const a=(req.headers.authorization||'').replace('Bearer ','');return a.startsWith('tok-')?a.slice(4):null};
const H={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
const send=(res,c,b)=>{res.writeHead(c,{...H,'Content-Type':'application/json'});res.end(JSON.stringify(b))};
http.createServer((req,res)=>{let body=[];req.on('data',c=>body.push(c));req.on('end',()=>{body=Buffer.concat(body);const u=new URL(req.url,'http://x');
 if(req.method==='OPTIONS'){res.writeHead(204,H);return res.end()}
 if(u.pathname==='/__stats')return send(res,200,{pushes,pulls,rowsPushed,docs:docs.size});
 if(u.pathname==='/auth/v1/token'){const j=JSON.parse(body);if(u.searchParams.get('grant_type')==='refresh_token')return send(res,200,{access_token:tok(j.refresh_token),refresh_token:j.refresh_token,expires_in:3600,user:{id:j.refresh_token,email:''}});
  const x=users[j.email];if(!x||x.pw!==j.password)return send(res,400,{error_code:'invalid_credentials',msg:'Invalid login credentials'});return send(res,200,{access_token:tok(x.id),refresh_token:x.id,expires_in:3600,user:{id:x.id,email:j.email}})}
 const me=uidOf(req);if(!me)return send(res,401,{message:'JWT expired'});
 if(u.pathname==='/auth/v1/logout')return send(res,204,{});
 if(u.pathname==='/rest/v1/rh_membres'){if(u.searchParams.get('user_id'))return send(res,200,membres.filter(m=>m.user_id===me&&m.actif).map(m=>({...m,rh_orgs:{nom:orgs[m.org_id]}})));
  const org=u.searchParams.get('org_id').slice(3);return send(res,200,membres.filter(m=>m.org_id===org))}
 if(u.pathname==='/rest/v1/rpc/rh_push'){pushes++;const j=JSON.parse(body);const m=membres.find(x=>x.user_id===me&&x.org_id===j.p_org);
  for(const r of j.p_rows){if(m.role==='major'&&['m:bulletins','k:grille'].includes(r[0]))return send(res,403,{code:'42501',message:'new row violates row-level security policy'})}
  for(const r of j.p_rows){docs.set(j.p_org+'|'+r[0]+'|'+r[1],{org:j.p_org,coll:r[0],id:r[1],data:r[3]?null:r[2],del:!!r[3],maj:tick()});rowsPushed++}return send(res,200,{n:j.p_rows.length,now:tick()})}
 if(u.pathname==='/rest/v1/rpc/rh_pull'){pulls++;const j=JSON.parse(body);const k=[j.p_maj==='-infinity'?'':new Date(j.p_maj).toISOString(),j.p_coll,j.p_id];
  const iso=s=>new Date(s).toISOString();const l=[...docs.values()].filter(d=>d.org===j.p_org).map(d=>({...d,k:[iso(d.maj),d.coll,d.id]})).filter(d=>{for(let i=0;i<3;i++){if(d.k[i]>k[i])return true;if(d.k[i]<k[i])return false}return false}).sort((a,b)=>a.k<b.k?-1:a.k>b.k?1:0);
  // tri lexical sur tableaux : comparer composant par composant
  l.sort((a,b)=>{for(let i=0;i<3;i++){if(a.k[i]<b.k[i])return -1;if(a.k[i]>b.k[i])return 1}return 0});
  const r=l.slice(0,j.p_lim);return send(res,200,{rows:r.map(d=>[d.coll,d.id,d.data,d.del,d.maj]),n:r.length,now:tick()})}
 if(u.pathname==='/rest/v1/rpc/rh_org_creer'){const j=JSON.parse(body);const id='o'+Math.random().toString(36).slice(2,8);orgs[id]=j.p_nom;membres.push({user_id:me,org_id:id,role:'superadmin',nom:'Admin Test',actif:true});return send(res,200,id)}
 if(u.pathname==='/functions/v1/rh-admin'){const j=JSON.parse(body);if(j.action==='creer'){const id='u'+(Object.keys(users).length+1);users[j.email]={id,pw:j.password};membres.push({user_id:id,org_id:j.org,role:j.role,agent_id:j.agent_id,nom:j.nom,email:j.email,actif:true});return send(res,200,{ok:true,user_id:id})}
  const m=membres.find(x=>x.user_id===j.user_id&&x.org_id===j.org);if(j.action==='modifier'){Object.assign(m,Object.fromEntries(Object.entries({role:j.role,agent_id:j.agent_id,nom:j.nom,actif:j.actif}).filter(([,v])=>v!==undefined)))}return send(res,200,{ok:true})}
 if(u.pathname.startsWith('/storage/v1/object/')){const key=u.pathname.replace('/storage/v1/object/authenticated/','').replace('/storage/v1/object/','');if(req.method==='POST'){files.set(key,{b:body,t:req.headers['content-type']});return send(res,200,{Key:key})}
  if(req.method==='GET'){const f=files.get(key);if(!f)return send(res,404,{message:'not found'});res.writeHead(200,{...H,'Content-Type':f.t});return res.end(f.b)}if(req.method==='DELETE'){files.delete(key);return send(res,200,{})}}
 send(res,404,{message:'inconnu '+u.pathname})})}).listen(8787,()=>console.log('mock prêt'));
