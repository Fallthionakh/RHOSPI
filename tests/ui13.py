from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1366,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-24T17:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');S.page='params';render()")
    pg.wait_for_timeout(300);c=pg.locator('h2:has-text("législation sénégalaise")').locator('..');c.scroll_into_view_if_needed();c.screenshot(path='/tmp/pl_params.png')
    pg.fill('#pl_ipmTaux','8');pg.dispatch_event('#pl_ipmTaux','change');pg.wait_for_timeout(200)
    print('ipm:',pg.evaluate("DB.params.paieLeg.ipmTaux"))
    pg.evaluate("const a=DB.agents.find(x=>!estFonctionnaire(x)&&enPoste(x,today())&&bulletin(x,today().slice(0,7)).brut);S.page='remun';S.rem.tab='bul';S.rem.agentId=a.id;render()")
    pg.wait_for_timeout(300);pg.screenshot(path='/tmp/pl_fiche.png',full_page=True)
    print('erreurs:',errs)
    b.close()
