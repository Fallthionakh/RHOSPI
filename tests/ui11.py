import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        await pg.click('#side .nav button[data-p="agents"]');await pg.click('#main tr.clic');await pg.wait_for_timeout(300)
        await pg.evaluate("[...document.querySelectorAll('#main h2')].find(h=>h.textContent==='Liste de présence').scrollIntoView()");await pg.screenshot(path='/tmp/ui_lp_agent.png')
        d=await pg.evaluate("addDays(today(),-6)");inp=await pg.query_selector('input[data-chg="lpDate"][data-k="du"]');await inp.fill(d);await inp.dispatch_event('change');await pg.wait_for_timeout(200)
        print('période  :',await pg.evaluate("S.lp.du+' → '+S.lp.au"),'| lignes :',await pg.evaluate("[...document.querySelectorAll('#main h2')].find(h=>h.textContent==='Liste de présence').closest('.card').querySelectorAll('tbody tr').length"))
        await pg.click('#side .nav button[data-p="rapports"]');await pg.click('[data-act="rapVue"][data-v="presence"]');await pg.select_option('#fsvc','URG');await pg.wait_for_timeout(300)
        print('service  :',await pg.evaluate("document.querySelector('#main .card h2').textContent"),'| lignes :',await pg.evaluate("S.lpL.length"));await pg.screenshot(path='/tmp/ui_lp_svc.png')
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
