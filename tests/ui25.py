from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1440,'height':1000});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T14:55:00");pg.goto(html);pg.wait_for_timeout(900)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='agent'&&x.agentId==='610321')||Object.assign({},profils().find(x=>x.role==='agent'),{agentId:'610321',nom:'Moussa Seck'});S.page='mespt';render()");pg.wait_for_timeout(500)
    pg.locator('h3:has-text("Qui est de garde")').scroll_into_view_if_needed();pg.wait_for_timeout(200);pg.screenshot(path='/tmp/sim_liste.png')
    print('jours listés:',pg.locator('.agli').count(),'erreurs',errs);b.close()
