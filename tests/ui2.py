import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(500)
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        mat=await pg.evaluate("DB.agents.find(a=>a.serviceId==='URG'&&a.posteId==='AS').mat")
        await pg.select_option('#profil','rh');await pg.click('#side .nav button[data-p="demandes"]')
        await pg.click('#main .head [data-act="demNew"]');await pg.select_option('#dm_nat','affectation');await pg.wait_for_timeout(150)
        await pg.fill('#dm_ag',mat);await pg.press('#dm_ag','Tab');await pg.wait_for_timeout(200)
        await pg.select_option('#dm_svc','MAT');await pg.fill('#dm_motif','Renfort de la maternité');await pg.click('[data-act="demOk"]');await pg.wait_for_timeout(200)
        print('1 RH crée   :',await t());print('  boutons RH :',await pg.eval_on_selector_all('#main tr:first-child [data-act]','o=>o.map(x=>x.textContent).join(" | ")') )
        await pg.select_option('#profil','chef');await pg.click('#side .nav button[data-p="demandes"]')
        await pg.click('#main [data-act="avis"][data-t="dem"]');await pg.fill('#av_com','Accord, remplacement prévu');await pg.click('[data-act="avisOk"]');await pg.wait_for_timeout(200)
        print('2 chef avis :',await t())
        await pg.select_option('#profil','rh');await pg.click('#side .nav button[data-p="demandes"]');await pg.screenshot(path='/tmp/ui_dem.png')
        await pg.click('#main [data-act="demVal"]');await pg.wait_for_timeout(150);await pg.click('[data-act="demValOk"]');await pg.wait_for_timeout(200)
        print('3 RH valide :',await t())
        print('  résultat  :',await pg.evaluate(f"(a=>a.serviceId+' / '+DB.demandes.find(m=>m.agentId===a.id&&m.nature==='affectation').statut+' / n° '+DB.demandes.find(m=>m.agentId===a.id&&m.nature==='affectation').numDecision)(DB.agents.find(a=>a.mat==='{mat}'))"))
        # congé : avis du chef puis validation RH
        await pg.select_option('#profil','sa');await pg.click('#side .nav button[data-p="absences"]');await pg.click('#main [data-act="avis"][data-t="abs"]');await pg.click('[data-act="avisOk"]');await pg.wait_for_timeout(150)
        await pg.select_option('#profil','rh');await pg.click('#side .nav button[data-p="absences"]');await pg.click('#main [data-act="absVal"]');await pg.wait_for_timeout(150);await pg.screenshot(path='/tmp/ui_val.png');await pg.click('[data-act="absValOk"]');await pg.wait_for_timeout(200)
        print('4 congé     :',await t());print('\n'.join(errs) or 'aucune erreur de page')
        await b.close()
asyncio.run(main())
