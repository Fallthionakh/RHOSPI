from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1366,'height':860});pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T22:20:00");pg.goto(html);pg.wait_for_timeout(800)
    def comme(pid):pg.evaluate(f"S.msgF='chat';S.fil=null;S.filMob=false;S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.id==='{pid}');S.page='messages';render()");pg.wait_for_timeout(250)
    comme('ag')
    pg.click('.head [data-act=msgNouveau]');pg.click('[data-act=cmpT][data-t=re]');pg.click('[data-act=cmpAdd][data-k="r:rh"]');pg.fill('#cmp_obj','Attestation de travail');pg.fill('#cmp_txt','Bonjour, pourriez-vous me délivrer une attestation de travail ?');pg.click('[data-act=cmpEnvoyer]');pg.wait_for_timeout(400)
    comme('rh');pg.locator('.chf',has_text='Ibrahima').first.click();pg.wait_for_timeout(300)
    for t in ['Bonjour Ibrahima, bien reçu.','Elle sera prête demain à 10 h au bureau RH.']:
        pg.fill('#ch_txt',t);pg.keyboard.press('Enter');pg.wait_for_timeout(300)
    comme('ag');print('non lus agent:',pg.evaluate("msgN()"));pg.locator('.chf').first.click();pg.wait_for_timeout(300)
    pg.fill('#ch_txt','Merci beaucoup !');pg.click('[data-act=chEnvoyer]');pg.wait_for_timeout(300)
    print('bulles chez l\'agent : envoyées',pg.locator('.chb.env').count(),'reçues',pg.locator('.chb.rec').count(),'| non lus',pg.evaluate("msgN()"))
    print('position: env gauche',pg.evaluate("(()=>{const e=document.querySelector('.chb.env .bul').getBoundingClientRect(),r=document.querySelector('.chb.rec .bul').getBoundingClientRect(),z=document.getElementById('chm').getBoundingClientRect();return [Math.round(e.left-z.left),Math.round(z.right-r.right),getComputedStyle(document.querySelector('.chb.rec .bul')).backgroundColor]})()"))
    pg.screenshot(path='/tmp/ch1.png')
    comme('rh');pg.locator('.chf').first.click();pg.wait_for_timeout(300);pg.screenshot(path='/tmp/ch2.png')
    pg.set_viewport_size({'width':390,'height':844});comme('ag');pg.wait_for_timeout(200);pg.screenshot(path='/tmp/ch3.png');pg.locator('.chf').first.click();pg.wait_for_timeout(300);pg.screenshot(path='/tmp/ch4.png')
    print('erreurs',errs);b.close()
