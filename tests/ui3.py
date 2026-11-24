import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(500)
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        await pg.select_option('#profil','rh');await pg.click('#side .nav button[data-p="remun"]');await pg.screenshot(path='/tmp/ui_paie.png')
        await pg.click('#main [data-act="bulEdit"]');await pg.wait_for_timeout(150)
        await pg.fill('#bl_m0','300000');await pg.fill('#bl_nom','Rappel de salaire');await pg.fill('#bl_mt','15000');await pg.click('[data-act="bulAdd"]')
        await pg.fill('#bl_motif','Régularisation du mois');await pg.screenshot(path='/tmp/ui_edit.png');await pg.click('[data-act="bulOk"]');await pg.wait_for_timeout(200);print('modif   :',await t())
        await pg.check('#bul_all');await pg.click('[data-act="bulArchSel"]');await pg.wait_for_timeout(200);print('archive :',await t())
        await pg.click('[data-act="remTab"][data-t="rub"]');await pg.fill('#rb_nom','Indemnité de transport');await pg.fill('#rb_mt','10000');await pg.click('[data-act="rubAdd"]');await pg.wait_for_timeout(150);print('rubrique:',await t())
        inp=await pg.query_selector('[data-chg="grille"][data-r="base"]');await inp.fill('310000');await inp.press('Tab');await pg.wait_for_timeout(150);print('grille  :',await t());await pg.screenshot(path='/tmp/ui_rub.png',full_page=True)
        await pg.click('[data-act="remTab"][data-t="jour"]');print('journal :',await pg.evaluate("DB.journalPaie.length+' lignes ; '+DB.journalPaie.slice(0,3).map(j=>j.action).join(' | ')"))
        await pg.set_viewport_size({'width':400,'height':860});await pg.click('[data-act="remTab"][data-t="bul"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_paie_m.png')
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
