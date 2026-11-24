import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':900});errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        t=lambda:pg.evaluate("document.getElementById('toast')?document.getElementById('toast').textContent:''")
        ids=await pg.evaluate("""(()=>{const T=today(),l=DB.agents.filter(a=>a.serviceId==='URG').slice(1,3);l.forEach(a=>{DB.planning[a.id+'|'+T]='J';DB.pointages=DB.pointages.filter(p=>!(p.agentId===a.id&&p.date===T));DB.absences=DB.absences.filter(x=>x.agentId!==a.id)});DB.vacations.find(v=>v.code==='J').debut='00:10';index();save();return l.map(a=>a.id)})()""")
        await pg.click('#side .nav button[data-p="alertes"]');await pg.wait_for_timeout(200)
        k=f"abs|{ids[0]}|"+await pg.evaluate("today()");print('alerte présente :',await pg.evaluate(f"alertes(sel()).some(a=>a.key==='{k}')"))
        await pg.click(f'[data-act="alerteOuvrir"][data-k="{k}"]');await pg.wait_for_timeout(150);await pg.screenshot(path='/tmp/ui_al_abs.png')
        await pg.fill('#al_h','08:20');await pg.click('[data-act="alAbsOk"]');await pg.wait_for_timeout(200)
        print('présent    :',await t(),'| alerte disparue :',not await pg.evaluate(f"alertes(sel()).some(a=>a.key==='{k}')"),'| pointage :',await pg.evaluate(f"(p=>p.arrMode+' '+hm(p.arr)+' par '+p.arrPar)(PIX.get('{ids[0]}|'+today()))"))
        k2=f"abs|{ids[1]}|"+await pg.evaluate("today()")
        await pg.click(f'[data-act="alerteOuvrir"][data-k="{k2}"]');await pg.check('input[name="al_c"][value="just"]');await pg.click('[data-act="alAbsOk"]');await pg.wait_for_timeout(200)
        print('justifiée  : agent prérempli =',await pg.evaluate("document.getElementById('a_ag').value"))
        await pg.select_option('#a_type','Absence pour maladie');await pg.fill('#a_motif','Certificat médical');await pg.click('[data-act="absOk"]');await pg.wait_for_timeout(200)
        print('enregistrée:',await t(),'| alerte d\'arrivée disparue :',not await pg.evaluate(f"alertes(sel()).some(a=>a.key==='{k2}')"),'| nouvelle alerte :',await pg.evaluate("alertes(sel()).filter(a=>a.key.startsWith('dem|')).length"),'demande(s) à valider')
        print('\n'.join(errs) or 'aucune erreur de page');await b.close()
asyncio.run(main())
