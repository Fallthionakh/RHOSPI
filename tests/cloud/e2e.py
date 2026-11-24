from playwright.sync_api import sync_playwright
import json,urllib.request,time
st=lambda:json.loads(urllib.request.urlopen('http://127.0.0.1:8787/__stats').read())
URL='http://127.0.0.1:8788/app.html'
def route(pg):
    pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(path='/home/claude/tests/node_modules/jspdf/dist/jspdf.umd.min.js') if 'jspdf' in r.request.url else r.abort())
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    A=b.new_context(viewport={'width':1300,'height':900});pa=A.new_page();errs=[];pa.on('pageerror',lambda e:errs.append('A:'+str(e)));route(pa)
    pa.goto(URL);pa.wait_for_selector('#cl_form')
    pa.fill('#cl_email','admin@x.sn');pa.fill('#cl_mdp','mauvais');pa.click('#cl_ok');pa.wait_for_timeout(400)
    print('1 mauvais mdp:', 'incorrect' in pa.inner_text('#layer'))
    pa.fill('#cl_mdp','motdepasse1');pa.click('#cl_ok');pa.wait_for_selector('text=Comment voulez-vous commencer')
    print('2 org vide proposée')
    pa.click('[data-act=clDebut][data-m=demo]');pa.wait_for_selector('#side .who');pa.wait_for_timeout(500)
    for i in range(40):
        if pa.inner_text('#cl_etat')=='Synchronisé':break
        pa.wait_for_timeout(250)
    s=st();print('3 démo envoyée:',pa.inner_text('#cl_etat'),s)
    majeur=pa.evaluate("(()=>{const m=DB.services.find(s=>s.id==='MAT').major;return {id:m,lab:agLabel(ag(m))}})()")
    pa.evaluate("S.popPaieVu=true;closeModal();S.page='params';S.pSvc='';render()");pa.wait_for_timeout(600)
    print('4 carte comptes:', 'Comptes d' in pa.content() and 'Admin Test' in pa.content())
    pa.fill('#cc_nom','Major Maternité');pa.fill('#cc_email','major@x.sn');pa.fill('#cc_mdp','motdepasse2');pa.select_option('#cc_role','major');pa.fill('#cc_ag',majeur['lab']);pa.click('[data-act=clCptNew]');pa.wait_for_timeout(700)
    print('5 compte créé:', 'Major Maternité' in pa.inner_text('#main'))
    B=b.new_context(viewport={'width':390,'height':844});pb=B.new_page();pb.on('pageerror',lambda e:errs.append('B:'+str(e)));route(pb)
    t0=time.time();pb.goto(URL);pb.wait_for_selector('#cl_form');pb.fill('#cl_email','major@x.sn');pb.fill('#cl_mdp','motdepasse2');pb.click('#cl_ok');pb.wait_for_selector('#side .who')
    print('6 major connecté en %.1fs, agents:'%(time.time()-t0),pb.evaluate('DB.agents.length'),'profil:',pb.evaluate('S.profil.role'), pb.evaluate("who()"))
    pb.evaluate("S.popPaieVu=true;closeModal()")
    # le major pointe un agent de son service
    r=pb.evaluate("""(()=>{const T=today();const a=actifs(['MAT']).find(a=>{const v=vacOf(a.id,T);const p=PIX.get(a.id+'|'+T);return v&&v.travail&&!(p&&p.arr)&&!absOf(a.id,T)});if(!a)return null;const x=pointer(a.id,'arr',{mode:'manuel',decl:new Date()});return {id:a.id,ok:x.ok,msg:x.msg}})()""")
    print('7 pointage major:',r)
    pb.wait_for_timeout(1500);print('   état B:',pb.inner_text('#cl_etat'))
    n=pa.evaluate("clPull()");pa.wait_for_timeout(300)
    vu=pa.evaluate("(id=>{const p=PIX.get(id+'|'+today());return !!(p&&p.arr)})('%s')"%r['id']) if r else None
    print('8 A voit le pointage de B:',vu,'lignes reçues',n)
    # B : écriture interdite (paie) -> refusée, le reste passe
    pb.evaluate("DB.bulletins['zz|2026-11']={x:1};DB.params.hsSeuil=20;save()");pb.wait_for_timeout(2500)
    print('9 refus paie:',pb.evaluate('CL.refus'),'en attente:',pb.evaluate('CL.pend.size'),'état:',pb.inner_text('#cl_etat'))
    pa.evaluate('clPull()');pa.wait_for_timeout(300);print('   A reçoit hsSeuil=20:',pa.evaluate('DB.params.hsSeuil'),'bulletin interdit absent:',pa.evaluate("!DB.bulletins['zz|2026-11']"))
    # rechargement : démarrage depuis le cache, peu de lecture
    s0=st();t0=time.time();pa.reload();pa.wait_for_selector('#side .who');s1=st()
    print('10 rechargement depuis cache %.1fs, appels pull: %d'%(time.time()-t0,s1['pulls']-s0['pulls']),'agents',pa.evaluate('DB.agents.length'))
    # suppression propagée
    aid=pa.evaluate("(()=>{const x=DB.absences[0];DB.absences.splice(0,1);save();return x.id})()");pa.wait_for_timeout(1500)
    pb.evaluate('clPull()');pb.wait_for_timeout(300);print('11 suppression propagée:',pb.evaluate("!DB.absences.some(x=>x.id==='%s')"%aid))
    # pièce jointe via stockage
    ok=pa.evaluate("filePut('f1',new Blob(['bonjour'],{type:'text/plain'})).then(()=>fileGet('f1')).then(b=>b.text())");print('12 fichier:',ok)
    # hors ligne puis reconnexion
    A.set_offline(True);pa.evaluate("DB.etab='Hôpital Régional de Thiès (test)';save()");pa.wait_for_timeout(1500);print('13 hors ligne:',pa.inner_text('#cl_etat'))
    A.set_offline(False);pa.evaluate("window.dispatchEvent(new Event('online'))");pa.wait_for_timeout(1500);print('   reconnecté:',pa.inner_text('#cl_etat'))
    pb.evaluate('clPull()');pb.wait_for_timeout(500);print('   B voit le nom:',pb.evaluate('DB.etab'))
    pb.screenshot(path='/tmp/cl_major.png');pa.screenshot(path='/tmp/cl_admin.png')
    print('erreurs:',errs);print(st())
    b.close()
