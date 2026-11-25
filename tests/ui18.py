from playwright.sync_api import sync_playwright
import pathlib,openpyxl
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
LIB={'xlsx':'/home/claude/node_modules/xlsx/dist/xlsx.full.min.js','jspdf':'/home/claude/node_modules/jspdf/dist/jspdf.umd.min.js'}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1640,'height':900},accept_downloads=True);pg=ctx.new_page()
    pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(path=LIB['xlsx' if 'xlsx' in r.request.url else 'jspdf'],content_type='application/javascript') if ('xlsx' in r.request.url or 'jspdf' in r.request.url) else r.abort())
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T10:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');S.page='remun';S.rem.tab='recap';render()");pg.wait_for_timeout(400)
    i=pg.locator('.jp-in').nth(1);i.click();pg.keyboard.type('45000');pg.keyboard.press('Enter');pg.wait_for_timeout(500)
    print('valeur:',i.input_value(),'| total net:',pg.inner_text('#rc_tot').replace('\n',' ')[:160])
    pg.screenshot(path='/tmp/jp1.png')
    pg.fill('#jp_q','sow');pg.wait_for_timeout(300);print('lignes visibles:',pg.locator('.jp-tab tbody tr:visible').count())
    pg.fill('#jp_q','');pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.locator('.txbar [data-act=tXls]').first.click()
    d.value.save_as('/tmp/jp.xlsx');w=openpyxl.load_workbook('/tmp/jp.xlsx').active;print('excel:',[c.value for c in w[1]][:7],[c.value for c in w[2]][:7])
    pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(300);pg.screenshot(path='/tmp/jp2.png')
    print('erreurs:',errs);b.close()
