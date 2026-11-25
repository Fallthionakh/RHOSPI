from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
open('/tmp/scan.heic','wb').write(b'x'*2048);open('/tmp/vieux.doc','wb').write(b'y'*4096)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1366,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T14:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='agent');S.page='remun';render()");pg.wait_for_timeout(300)
    pg.click('.bmm[data-m="2026-06"]');pg.wait_for_timeout(200);print('mois choisi:',pg.evaluate("S.rem.ym"),'|',pg.inner_text('h2'))
    pg.select_option('select[data-chg=bulAn]','2025');pg.wait_for_timeout(200);print('année 2025 →',pg.evaluate("S.rem.ym"))
    pg.evaluate("S.rem.ym='2026-11';render()");pg.wait_for_timeout(200);pg.locator('.bmb').screenshot(path='/tmp/bm.png')
    pg.evaluate("S.page='moi';S.moiT='docs';render()");pg.wait_for_timeout(200)
    for f in ['/tmp/scan.heic','/tmp/vieux.doc']:
        pg.click('button[data-act=docNewMoi]');pg.set_input_files('#dmo_f',f);pg.click('[data-act=docMoiOk]');pg.wait_for_timeout(400)
    print('documents agent:',pg.evaluate("DB.documents.filter(d=>d.agentId===S.profil.agentId).map(d=>d.nom).join(', ')"))
    pg.evaluate("S.profil=profils().find(x=>x.role==='superadmin');S.page='agents';render()");pg.wait_for_timeout(200)
    pg.evaluate("ACT.newDoc({id:DB.agents[3].id})");pg.wait_for_timeout(200);pg.set_input_files('#d_file','/tmp/vieux.doc');pg.select_option('#d_type','Diplôme');pg.click('[data-act=docOk]');pg.wait_for_timeout(400)
    print('document RH:',pg.evaluate("DB.documents.filter(d=>d.agentId===DB.agents[3].id).map(d=>d.nom).join(', ')"))
    print('erreurs:',errs);b.close()
