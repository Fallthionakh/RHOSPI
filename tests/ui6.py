import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        await pg.click('#side .nav button[data-p="params"]');await pg.wait_for_timeout(200)
        await pg.fill('#org_lignes','RÉPUBLIQUE DU SÉNÉGAL\nMINISTÈRE DE LA SANTÉ\nCENTRE HOSPITALIER RÉGIONAL DE THIÈS');await pg.fill('#org_adresse','Route de Dakar, Thiès');await pg.fill('#org_telephone','33 951 00 00');await pg.fill('#org_ville','Thiès')
        await pg.set_input_files('input[data-chg="orgLogo"]','/tmp/logo.png');await pg.wait_for_timeout(500);print('logo      :',await pg.evaluate("DB.entete.logo.slice(0,22)"))
        await pg.screenshot(path='/tmp/ui_org.png')
        # prise en charge
        await pg.click('#side .nav button[data-p="pec"]');await pg.click('#main .head [data-act="pecNew"]');await pg.wait_for_timeout(150)
        mat=await pg.evaluate("DB.agents[5].mat");await pg.fill('#pc_ag',mat);await pg.press('#pc_ag','Tab');await pg.select_option('#pc_lien','Épouse');await pg.fill('#pc_benef','Awa Ndiaye');await pg.fill('#pc_svc','Imagerie médicale')
        await pg.check('.pc_acte[value="Radio"]');await pg.check('.pc_acte[value="Échographie"]');await pg.fill('#pc_mt','45000');await pg.fill('#pc_details','Échographie pelvienne');await pg.screenshot(path='/tmp/ui_pecform.png')
        await pg.click('[data-act="pecOk"]');await pg.wait_for_timeout(200);print('création  :',await t())
        await pg.click('#main [data-act="pecEdit"]');await pg.fill('#pc_mt','50000');await pg.click('[data-act="pecOk"]');await pg.wait_for_timeout(200);print('modif     :',await t(),'|',await pg.evaluate("DB.pec[0].modifs[0].detail"))
        await pg.click('#main [data-act="pecVoir"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_pecvoir.png');await pg.evaluate("closeModal()")
        # organisation
        await pg.click('#side .nav button[data-p="params"]');await pg.fill('#org_new','Centre de santé de Mbour');await pg.click('[data-act="orgNew"]');await pg.wait_for_timeout(400)
        print('nouvelle  :',await pg.evaluate("DB.etab+' / '+DB.agents.length+' agents / '+KEY"),'| barre :',await pg.evaluate("document.querySelector('.brand small').textContent"))
        await pg.click('#side .nav button[data-p="dashboard"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_orgvide.png')
        await pg.reload();await pg.wait_for_timeout(600);print('après rechargement :',await pg.evaluate("DB.etab"))
        await pg.evaluate("S.popPaieVu=true;closeModal()");await pg.click('#side .nav button[data-p="params"]');await pg.click('[data-act="orgOuvrir"][data-id="principal"]');await pg.wait_for_timeout(400)
        print('retour    :',await pg.evaluate("DB.etab+' / '+DB.agents.length+' agents / '+DB.pec.length+' prise(s) en charge / logo '+!!DB.entete.logo"))
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
