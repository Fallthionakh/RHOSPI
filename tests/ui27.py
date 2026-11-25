from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
open('/tmp/note.pdf','wb').write(b'%PDF-1.4\n%%EOF')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1366,'height':900},accept_downloads=True);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T15:20:00");pg.goto(html);pg.wait_for_timeout(800)
    def comme(pid):pg.evaluate(f"S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.id==='{pid}');S.page=ROLES[S.profil.role].menu[0];render()");pg.wait_for_timeout(300)
    comme('rh');print('menu RH:',pg.inner_text('nav.nav').replace('\n',' | '))
    # RH écrit au service Maternité + poste Major, avec PJ
    pg.click('.msgcard [data-act=msgNouveau]');pg.wait_for_timeout(200)
    pg.click('[data-act=cmpT][data-t=sv]');pg.click('[data-act=cmpAdd][data-k="s:MAT"]')
    pg.click('[data-act=cmpT][data-t=po]');pg.locator('[data-act=cmpAdd]',has_text='Major').first.click()
    pg.click('[data-act=cmpT][data-t=ag]');pg.fill('#cmp_q','Ibrahima');pg.wait_for_timeout(150);pg.locator('[data-act=cmpAdd]').first.click()
    print('destinataires:',pg.inner_text('#cmp_dest').replace('\n',' '))
    pg.fill('#cmp_obj','Réunion du personnel vendredi');pg.fill('#cmp_txt','Réunion vendredi à 10 h en salle de conférence. Ordre du jour joint.');pg.set_input_files('#cmp_pj','/tmp/note.pdf')
    pg.locator('#layer [role=dialog]').screenshot(path='/tmp/ms1.png');pg.click('[data-act=cmpEnvoyer]');pg.wait_for_timeout(400)
    print('envoyés RH:',pg.locator('.msg').count())
    # Moussa Seck (major Maternité) reçoit
    comme('maj2');pg.evaluate("S.page='dashboard';render()");pg.wait_for_timeout(300);print('dashboard major:',pg.inner_text('.msgcard').replace('\n',' '));pg.screenshot(path='/tmp/ms2.png')
    pg.click('.msgcard [data-f=nonlus]');pg.wait_for_timeout(200);pg.screenshot(path='/tmp/ms3.png');pg.locator('.msg').first.click();pg.wait_for_timeout(300)
    with pg.expect_download() as d: pg.click('[data-act=msgPj]')
    print('PJ téléchargée:',d.value.suggested_filename)
    pg.click('[data-act=msgRepondre]');pg.wait_for_timeout(200);pg.fill('#cmp_txt','Bien reçu, je transmets à l\'équipe.');pg.click('[data-act=cmpEnvoyer]');pg.wait_for_timeout(300)
    comme('rh');print('RH non lus:',pg.evaluate("msgN()"),'| nav:',pg.inner_text('nav.nav [data-p=messages]').replace('\n',' '))
    comme('ag');print('agent Ibrahima non lus:',pg.evaluate("msgN()"));pg.evaluate("S.page='messages';render()");pg.wait_for_timeout(200)
    # agent écrit au service RH
    pg.click('[data-act=msgNouveau]');pg.click('[data-act=cmpT][data-t=re]');pg.click('[data-act=cmpAdd][data-k="r:rh"]');pg.fill('#cmp_obj','Attestation de travail');pg.fill('#cmp_txt','Bonjour, je souhaite une attestation de travail.');pg.click('[data-act=cmpEnvoyer]');pg.wait_for_timeout(300)
    comme('rh');print('RH non lus après message agent:',pg.evaluate("msgN()"))
    comme('dir');print('directeur non lus:',pg.evaluate("msgN()"))
    pg.set_viewport_size({'width':390,'height':844});comme('maj2');pg.evaluate("S.page='dashboard';render()");pg.wait_for_timeout(300);pg.screenshot(path='/tmp/ms4.png')
    print('erreurs',errs);b.close()
