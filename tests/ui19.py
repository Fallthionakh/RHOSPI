from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome')
    for w,h,n in [(1600,900,'pc'),(1280,800,'pc2'),(820,1180,'tab'),(390,844,'tel')]:
        pg=b.new_page(viewport={'width':w,'height':h});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.clock.install(time="2026-11-25T10:00:00");pg.goto(html);pg.wait_for_timeout(700)
        pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');S.page='remun';S.rem.tab='recap';render()");pg.wait_for_timeout(400)
        m=pg.evaluate("(()=>{const t=document.querySelector('.jp-tw'),d=document.scrollingElement;return {tableau:t.scrollWidth-t.clientWidth,page:d.scrollWidth-d.clientWidth}})()")
        i=pg.locator('.jp-in').nth(1);i.click();pg.keyboard.type('31000');pg.keyboard.press('Tab');pg.wait_for_timeout(300)
        pg.locator('.jp-card').screenshot(path=f'/tmp/j_{n}.png') if n.startswith('pc') else pg.screenshot(path=f'/tmp/j_{n}.png')
        print(n,'débordement',m,'valeur',i.input_value(),'erreurs',errs);pg.close()
    b.close()
