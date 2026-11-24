import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.route('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',lambda r:r.fulfill(path='/home/claude/tests/node_modules/xlsx/dist/xlsx.full.min.js',content_type='application/javascript'))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        await pg.click('#side .nav button[data-p="pec"]');await pg.wait_for_timeout(200)
        await pg.fill('#tf_svc','Laboratoire');await pg.fill('#tf_nom','Créatininémie');await pg.fill('#tf_prix','2000');await pg.click('[data-act="pcTarifAdd"]');await pg.wait_for_timeout(200);print('ajout     :',await t(),'| service gardé :',await pg.evaluate("val('tf_svc')"))
        await pg.set_input_files('input[data-chg="pcImport"]','/tmp/tarifs_test.xlsx');await pg.wait_for_timeout(2500)
        print('aperçu    :',await pg.evaluate("[...document.querySelectorAll('#layer .kpi')].map(k=>k.textContent).join(' / ')"));print('résultats :',await pg.evaluate("[...document.querySelectorAll('#layer tbody tr td:last-child')].map(td=>td.textContent).join(' | ')"))
        await pg.evaluate("document.getElementById('tarifs')&&0");await pg.screenshot(path='/tmp/ui_imp.png')
        await pg.click('[data-act="pcImportOk"]');await pg.wait_for_timeout(200);print('import    :',await t())
        print('catalogue :',await pg.evaluate("DB.pecCat.map(c=>c.service+': '+c.actes.map(a=>a.nom+' '+a.prix).join(', ')).filter(x=>/Labo|Imagerie|Pharma/.test(x)).join(' || ')"))
        inp=await pg.query_selector('input[data-chg="pcRen"][data-t="a"][data-a="Radio"]');await inp.fill('Radiographie standard');await inp.press('Tab');await pg.wait_for_timeout(200);print('renommé   :',await t())
        await pg.evaluate("document.getElementById('tarifs').scrollIntoView()");await pg.screenshot(path='/tmp/ui_tarifs.png')
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
