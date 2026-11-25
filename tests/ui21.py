from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
LIB={'xlsx':'/home/claude/node_modules/xlsx/dist/xlsx.full.min.js','jspdf':'/home/claude/node_modules/jspdf/dist/jspdf.umd.min.js'}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1366,'height':900},accept_downloads=True);pg=ctx.new_page()
    pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(path=LIB['xlsx' if 'xlsx' in r.request.url else 'jspdf'],content_type='application/javascript') if ('xlsx' in r.request.url or 'jspdf' in r.request.url) else r.abort())
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T14:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='agent');S.page='moi';render()");pg.wait_for_timeout(300)
    print('menu:',pg.inner_text('nav.nav').replace('\n',' | '))
    pg.click('nav.nav [data-p=mespt]');pg.wait_for_timeout(400);pg.screenshot(path='/tmp/mp1.png',full_page=True)
    print('borne visible ?',pg.locator('text=Pointer l\'arrivée').count())
    pg.evaluate("S.page='pointage';render()");pg.wait_for_timeout(200);print('page pointage → ',pg.inner_text('h1'));pg.click('nav.nav [data-p=mespt]');pg.wait_for_timeout(300)
    pg.click('[data-act=mpMode][data-m=an]');pg.wait_for_timeout(400);print('année:',pg.inner_text('.kpis').replace('\n',' ')[:200])
    with pg.expect_download() as d: pg.click('[data-act=mpPdf]')
    print('pdf',d.value.suggested_filename)
    with pg.expect_download() as d: pg.click('[data-act=dcXls]')
    print('xlsx',d.value.suggested_filename)
    pg.click('[data-act=mpMode][data-m=""]');pg.click('[data-act=mpRecl]');pg.wait_for_timeout(200);print('réclamation préremplie:',pg.input_value('#rc_cat'))
    pg.evaluate("closeModal()");pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(300);pg.screenshot(path='/tmp/mp2.png')
    print('erreurs:',errs);b.close()
