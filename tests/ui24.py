from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for w,h,n in [(1440,900,'pc'),(390,844,'tel')]:
        pg=b.new_page(viewport={'width':w,'height':h});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.clock.install(time="2026-11-25T14:55:00");pg.goto(html);pg.wait_for_timeout(900)
        pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='agent'&&x.agentId==='610321')||Object.assign({},profils().find(x=>x.role==='agent'),{agentId:'610321',nom:'Moussa Seck'});S.page='mespt';render()");pg.wait_for_timeout(500)
        c=pg.locator('h2:has-text("Agenda du service")').locator('xpath=ancestor::div[contains(@class,"card")][1]')
        c.screenshot(path=f'/tmp/sim_{n}.png')
        if n=='pc':
            print(pg.inner_text('h1'),'—',pg.inner_text('.main .head .sub')[:60])
            print(pg.locator('.agc .agi').count(),'créneaux dans le calendrier ;',pg.locator('.agl .agtel').count(),'numéros cliquables')
            print('fiches agents visibles par Moussa (démo) :',pg.evaluate("DB.agents.length"))
            print(pg.inner_text('.agl').split('\n')[:12])
        print(n,'erreurs',errs);pg.close()
    b.close()
