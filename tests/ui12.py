from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':390,'height':844})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-17T23:07:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();DB=seed(new Date(2026,10,10,9));save();S.page='dashboard';render()")
    btn=pg.locator('[data-act=alerteOuvrir][data-k^="sous|URG"]').first;print('bouton:',btn.inner_text());btn.click();pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/sous1.png',full_page=False)
    for i in range(2): pg.locator('[data-act=sousArr]').first.click();pg.wait_for_timeout(200)
    pg.select_option('#so_pr','1');pg.click('[data-act=sousRenfort]');pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/sous2.png');print('levée:', 'alerte est levée' in pg.content(),'erreurs:',errs)
    b.close()
