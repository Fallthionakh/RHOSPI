from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
open('/tmp/rapport.docx','wb').write(b'PK'+b'x'*500)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1300,'height':900},accept_downloads=True);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T15:35:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.id==='ag');S.page='messages';render()");pg.wait_for_timeout(200)
    pg.click('[data-act=msgNouveau]');pg.click('[data-act=cmpT][data-t=re]');pg.click('[data-act=cmpAdd][data-k="r:superadmin"]');pg.fill('#cmp_obj','test');pg.fill('#cmp_txt','Ceci est pour tester');pg.set_input_files('#cmp_pj',['/tmp/logo chrt bon.jpeg','/tmp/rapport.docx']);pg.click('[data-act=cmpEnvoyer]');pg.wait_for_timeout(400)
    print('envoyés:',pg.evaluate("JSON.stringify(DB.messages.filter(m=>m.cles).map(m=>[m.objet,m.cles,(m.pj||[]).length]))"),pg.evaluate("document.querySelector('#layer').innerText.slice(0,200)"));pg.evaluate("S.profil=profils().find(x=>x.id==='sa');S.msgF='recus';S.page='messages';render()");pg.wait_for_timeout(200)
    pg.locator('.msg').first.click();pg.wait_for_timeout(300);pg.locator('[data-act=msgPj]').first.click();pg.wait_for_timeout(500)
    pg.screenshot(path='/tmp/pj1.png');print('image affichée:',pg.locator('#pjv img').count())
    with pg.expect_download() as d: pg.click('[data-act=pjDl]')
    print('téléchargé:',d.value.suggested_filename)
    pg.click('[data-act=pjFermer]');pg.wait_for_timeout(200);print('message toujours ouvert:',pg.locator('#layer [role=dialog]').count())
    pg.locator('[data-act=msgPj]').nth(1).click();pg.wait_for_timeout(400);print('docx:',pg.inner_text('#pjv')[:80].replace('\n',' '))
    print('erreurs',errs);b.close()
