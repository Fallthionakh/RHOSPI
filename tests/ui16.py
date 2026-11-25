from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
LIB={'xlsx':'/home/claude/node_modules/xlsx/dist/xlsx.full.min.js','jspdf':'/home/claude/node_modules/jspdf/dist/jspdf.umd.min.js'}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1366,'height':900},accept_downloads=True);pg=ctx.new_page()
    pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(path=LIB['xlsx' if 'xlsx' in r.request.url else 'jspdf'],content_type='application/javascript') if ('xlsx' in r.request.url or 'jspdf' in r.request.url) else r.abort())
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-24T17:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');S.page='remun';render()")
    pg.click('[data-act=remTab][data-t=decl]');pg.wait_for_timeout(300)
    pg.select_option('select[data-k=org]','ipres');pg.wait_for_timeout(300)
    pg.click('[data-act=dcRac][data-k=t]');pg.wait_for_timeout(400)
    pg.screenshot(path='/tmp/dc1.png',full_page=True)
    with pg.expect_download() as d: pg.click('[data-act=dcPdf]')
    d.value.save_as('/tmp/dc.pdf')
    pg.click('[data-act=remTab][data-t=rrub]');pg.wait_for_timeout(300)
    pg.select_option('select[data-k=rr]','impot');pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/dc2.png',full_page=True)
    with pg.expect_download() as d: pg.click('[data-act=dcXls]')
    d.value.save_as('/tmp/rr.xlsx');print('fichier',d.value.suggested_filename)
    pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(300);pg.screenshot(path='/tmp/dc3.png')
    print('erreurs:',errs)
    b.close()
