from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1366,'height':900})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T10:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');S.page='remun';S.rem.tab='rrub';render()");pg.wait_for_timeout(300)
    pg.select_option('select[data-k=rr]','primeRisque') if pg.locator('select[data-k=rr] option[value=primeRisque]').count() else pg.select_option('select[data-k=rr]','base')
    pg.wait_for_timeout(300)
    i=pg.locator('input[data-chg=rrEdit]').first;i.fill('123456');i.press('Tab');pg.wait_for_timeout(400)
    print('toast/valeur:',pg.locator('input[data-chg=rrEdit]').first.input_value())
    pg.click('[data-act=remTab][data-t=jour]');pg.wait_for_timeout(400)
    pg.screenshot(path='/tmp/sv1.png')
    print(pg.evaluate("DB.suivi.slice(0,3).map(x=>x.mod+' | '+x.action+' | '+x.cible+' | '+x.det.slice(0,80)).join('\\n')"))
    pg.click('[data-act=remTab][data-t=recap]');pg.wait_for_timeout(300);print('onglets:',pg.inner_text('.main .row').replace('\n',' | ')[:200])
    print('erreurs:',errs)
    b.close()
