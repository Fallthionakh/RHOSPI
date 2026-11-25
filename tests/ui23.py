from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for w,h,n in [(1500,900,'pc'),(390,844,'tel')]:
        pg=b.new_page(viewport={'width':w,'height':h});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.clock.install(time="2026-11-25T14:00:00");pg.goto(html);pg.wait_for_timeout(800)
        pg.evaluate("S.popPaieVu=true;closeModal();const ym=today().slice(0,7),k=Object.keys(DB.planning).find(k=>k.includes('|'+ym)&&['G','P'].includes(DB.planning[k])),a=ag(k.split('|')[0]);S.profil=Object.assign({},profils().find(x=>x.role==='agent'),{agentId:a.id});S.page='mespt';render()");pg.wait_for_timeout(400)
        c=pg.locator('h2:has-text("Agenda du service")').locator('xpath=ancestor::div[contains(@class,"card")][1]');c.screenshot(path=f'/tmp/ag_{n}.png')
        print(n,pg.inner_text('h2:has-text("Agenda du service")'),'|',pg.locator('.agi').count(),'créneaux','| erreurs',errs);pg.close()
    b.close()
