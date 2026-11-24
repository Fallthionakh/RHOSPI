import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1440,'height':950})
        errs=[]
        pg.on('pageerror',lambda e:errs.append('PAGEERROR '+str(e)[:300]))
        pg.on('console',lambda m:errs.append('CONSOLE '+m.text[:200]) if m.type=='error' and 'net::' not in m.text and 'Failed to load resource' not in m.text else None)
        await pg.goto('file:///home/claude/pointview/index.html');await pg.wait_for_timeout(600);await pg.evaluate("S.popPaieVu=true;closeModal()")
        n=0
        profs=await pg.eval_on_selector_all('#profil option','o=>o.map(x=>x.value)')
        for pr in profs:
            await pg.select_option('#profil',pr)
            pages=await pg.eval_on_selector_all('#side .nav button','o=>o.map(x=>x.dataset.p)')
            for k in pages:
                await pg.click(f'#side .nav button[data-p="{k}"]');n+=1
                # ouvrir chaque fenêtre de la page puis la fermer
                acts=await pg.eval_on_selector_all('#main [data-act]','o=>[...new Set(o.map(x=>x.dataset.act))]')
                for a in acts:
                    if a in('go','tab','kpoint','mpoint','groupe','traiter','copier','absSt','week','plNav','plVue','plReset','remCsv','remPdf','bsPdf','bsCsv','gdPdf','gdDel','gdAdd','expCsv','expPdf','expOpen','expReset','expPre','frmNonF','remSel','remMois','agent','svcPick','resetAsk','docDl','decPdf','demPdf','cessation','reprise','fichePdf','resume','rapAgent','addVac','addDroit','delVac','resetVac','resetParams','demDec'):continue
                    el=await pg.query_selector(f'#main [data-act="{a}"]')
                    if not el:continue
                    try:
                        await el.click(timeout=1500);n+=1
                    except Exception as e:
                        errs.append(f'CLICK {pr}/{k}/{a}: {str(e)[:120]}')
                    await pg.evaluate("document.querySelector('#layer').innerHTML='';document.querySelector('#layer2').innerHTML=''")
                    if not await pg.query_selector(f'#side .nav button[data-p="{k}"].on'):
                        await pg.click(f'#side .nav button[data-p="{k}"]')
            if pr=='sa':
                for k,f in [('dashboard','dash'),('bilan','bilan'),('remun','remun'),('gardes','gardes')]:
                    await pg.click(f'#side .nav button[data-p="{k}"]');await pg.wait_for_timeout(200)
                    if k=='remun':
                        await pg.click('#main [data-act="remSel"]');await pg.wait_for_timeout(200)
                    await pg.screenshot(path=f'/tmp/ui_{f}.png',full_page=False)
                # fiche agent + export + calcul rayons
                await pg.click('#side .nav button[data-p="agents"]');await pg.click('#main tr.clic');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_agent.png')
                await pg.click('#side .nav button[data-p="agents"]');await pg.click('[data-act="expOpen"]');await pg.click('[data-act="expPre"][data-k="retraite"]');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_export.png')
                await pg.click('#side .nav button[data-p="absences"]');await pg.click('[data-act="rayons"]')
                mat=await pg.evaluate("DB.agents[10].mat");await pg.fill('#ry_ag',mat);await pg.fill('#ry_lieu','Ziguinchor');await pg.fill('#ry_km','450');await pg.wait_for_timeout(200);await pg.screenshot(path='/tmp/ui_rayons.png')
                await pg.click('[data-act="rayonsOk"]');await pg.wait_for_timeout(200);errs.append("INFO toast: "+await pg.evaluate("document.getElementById('toast').textContent"));await pg.evaluate("closeModal()")
                errs.append('INFO rayons: '+await pg.evaluate("(x=>x?x.rayons+' j rayons, fin '+x.fin:'ABSENT')(DB.absences.find(x=>x.rayons===4))"))
                # garde : 3e garde bloquée via l'écran
                await pg.click('#side .nav button[data-p="gardes"]')
                res=await pg.evaluate("""(async()=>{const a=DB.agents[1],lu=monday(addDays(today(),7));const out=[];for(const i of [0,2,4]){document.getElementById('gd_ag').value=a.mat;document.getElementById('gd_date').value=addDays(lu,i);ACT.gdAdd();out.push(document.getElementById('toast').textContent.slice(0,60))}return out.join(' | ')})()""")
                errs.append('INFO gardes: '+res)
        print('interactions',n);print('\n'.join(errs) or 'aucune erreur')
        await b.close()
asyncio.run(main())
