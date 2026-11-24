import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        await pg.click('#side .nav button[data-p="pec"]');await pg.click('#main .head [data-act="pecNew"]');await pg.wait_for_timeout(150)
        mat=await pg.evaluate("DB.agents[5].mat");await pg.fill('#pc_ag',mat);await pg.press('#pc_ag','Tab')
        await pg.select_option('#pc_lien','Épouse');print('sexe auto :',await pg.evaluate("document.getElementById('pc_bs').value"))
        await pg.fill('#pc_bp','Aïssatou');await pg.fill('#pc_bn','Diop');await pg.fill('#pc_ba','34')
        await pg.select_option('#pc_l_svc','Laboratoire');print('prestations Labo :',await pg.evaluate("[...document.getElementById('pc_l_acte').options].map(o=>o.textContent).join(' | ')"))
        await pg.select_option('#pc_l_acte','Analyses');await pg.fill('#pc_l_pu','4000');await pg.fill('#pc_l_nb','3');print('total ligne :',await pg.evaluate("document.getElementById('pc_l_tot').textContent"));await pg.click('[data-act="pecAdd"]')
        await pg.select_option('#pc_l_svc','Imagerie médicale');await pg.select_option('#pc_l_acte','__add__');await pg.wait_for_timeout(100);await pg.fill('#pcl_nom','Mammographie');await pg.fill('#pcl_prix','18000');await pg.click('[data-act="pcListeOk"]');await pg.wait_for_timeout(100)
        print('nouvelle prestation :',await pg.evaluate("val('pc_l_acte')+' '+val('pc_l_pu')"));await pg.click('[data-act="pecAdd"]')
        await pg.select_option('#pc_l_svc','__add__');await pg.wait_for_timeout(100);await pg.fill('#pcl_nom','Pharmacie');await pg.click('[data-act="pcListeOk"]');await pg.wait_for_timeout(100);print('nouveau service :',await pg.evaluate("val('pc_l_svc')"))
        await pg.click('[data-act="pecAdd"]');print('sans prestation :',await t())
        inp=await pg.query_selector('input[data-inp="pecLM"][data-i="0"][data-k="qte"]');await inp.fill('2');print('total     :',await pg.evaluate("document.getElementById('pc_tot').textContent"))
        await pg.evaluate("document.querySelector('#layer [role=dialog]').scrollTo(0,0)");await pg.screenshot(path='/tmp/ui_pec_form.png');print('débordement :',await pg.evaluate("(d=>d.scrollWidth-d.clientWidth)(document.querySelector('#layer [role=dialog]'))"))
        await pg.click('[data-act="pecOk"]');await pg.wait_for_timeout(200);print('enregistré:',await t(),'|',await pg.evaluate("JSON.stringify(DB.pec[0].lignes)+' '+DB.pec[0].montant"))
        await pg.click('#main [data-act="pecEdit"]');await pg.click('[data-act="pecDel"][data-i="1"]');await pg.click('[data-act="pecOk"]');await pg.wait_for_timeout(200);print('modif     :',await pg.evaluate("DB.pec[0].modifs[0].detail"))
        await pg.click('#main [data-act="pecVoir"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_pec_voir.png')
        await pg.click('#layer [data-act="pecPrint"]');await pg.wait_for_timeout(150);await pg.screenshot(path='/tmp/ui_pec_print.png');print('options   :',await pg.evaluate("[...document.querySelectorAll('input[name=pc_fmt]')].map(x=>x.value).join(',')"))
        await pg.evaluate("closeModal()");await pg.set_viewport_size({'width':400,'height':860});await pg.click('#main .head [data-act="pecNew"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_pec_m.png')
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
