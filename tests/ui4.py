import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(700)
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        print('popup     :',await pg.evaluate("document.querySelector('#layer [role=dialog] h2')?.textContent||'AUCUN'"));await pg.screenshot(path='/tmp/ui_pop.png')
        await pg.click('#layer [data-act="paieRecap"]');await pg.wait_for_timeout(300);await pg.screenshot(path='/tmp/ui_recap.png')
        nm=await pg.evaluate("S.recapD.rows[0].a.id")
        inp=await pg.query_selector(f'input[data-chg="recap"][data-id="{nm}"][data-r="risque"]');await inp.fill('50000');await inp.press('Tab');await pg.wait_for_timeout(200)
        print('cellule   :',await pg.evaluate(f"(b=>b.statut+' brut '+b.brut+' / affiché '+document.getElementById('rcb_{nm}').textContent)(bulletin(ag('{nm}'),S.rem.ym))"),'| focus suivant :',await pg.evaluate("document.activeElement.dataset.r"))
        await pg.click('#main [data-act="paieArret"]');await pg.wait_for_timeout(200);await pg.click('#layer [data-act="paieArretOk"]');await pg.wait_for_timeout(400)
        print('arrêt     :',await t());print('inputs restants :',await pg.evaluate("document.querySelectorAll('input[data-chg=recap]').length"))
        await pg.click('[data-act="remTab"][data-t="rub"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_rub2.png',full_page=True)
        await pg.click('[data-act="remTab"][data-t="bul"]');await pg.click('#main [data-act="remSel"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_bul2.png')
        await pg.reload();await pg.wait_for_timeout(600);print('popup après arrêt :',await pg.evaluate("document.querySelector('#layer [role=dialog] h2')?.textContent||'aucun'"))
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
