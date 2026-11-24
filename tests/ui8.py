import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        await pg.click('#side .nav button[data-p="alertes"]');await pg.wait_for_timeout(200)
        print('boutons :',await pg.evaluate("[...new Set([...document.querySelectorAll('#main [data-act=alerteOuvrir]')].map(b=>b.textContent))].join(' | ')"))
        n0=await pg.evaluate("alertes(sel()).filter(a=>!a.traite).length");await pg.screenshot(path='/tmp/ui_al.png')
        # arrivée non enregistrée : présent
        k=await pg.evaluate("(alertes(sel()).find(a=>a.key.startsWith('abs|'))||{}).key||''")
        if k:
            await pg.click(f'[data-act="alerteOuvrir"][data-k="{k}"]');await pg.wait_for_timeout(150);await pg.screenshot(path='/tmp/ui_al_abs.png')
            await pg.fill('#al_h','08:20');await pg.click('[data-act="alAbsOk"]');await pg.wait_for_timeout(200);print('régularisé :',await t(),'| alerte restante :',await pg.evaluate(f"alertes(sel()).some(a=>a.key==='{k}')"))
        k2=await pg.evaluate("(alertes(sel()).find(a=>a.key.startsWith('abs|'))||{}).key||''")
        if k2:
            await pg.click(f'[data-act="alerteOuvrir"][data-k="{k2}"]');await pg.check('input[name="al_c"][value="just"]');await pg.click('[data-act="alAbsOk"]');await pg.wait_for_timeout(200)
            print('absence justifiée : agent prérempli =',await pg.evaluate("document.getElementById('a_ag').value"),'| info :',(await pg.evaluate("document.getElementById('a_solde').textContent"))[:60]);await pg.evaluate("closeModal()")
        for pre in ['ret','inc','sous','dem','dmd','fc','rt','nf']:
            k=await pg.evaluate(f"(alertes(sel()).find(a=>a.key.startsWith('{pre}|'))||{{}}).key||''")
            if not k: print(pre,': (aucune alerte de ce type)');continue
            await pg.click('#side .nav button[data-p="alertes"]');await pg.wait_for_timeout(100)
            await pg.click(f'[data-act="alerteOuvrir"][data-k="{k}"]');await pg.wait_for_timeout(200)
            print(pre,':',await pg.evaluate("(document.querySelector('#layer h2')||{}).textContent||('page '+S.page)"));await pg.evaluate("closeModal()")
        print('alertes :',n0,'→',await pg.evaluate("alertes(sel()).filter(a=>!a.traite).length"))
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
