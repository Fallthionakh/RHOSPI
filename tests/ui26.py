from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T15:00:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');const a=DB.agents.find(x=>x.prenom==='Awa'&&x.nom==='Diop')||DB.agents[0];S.page='agents';render();ACT.edit({k:'posteOcc',id:a.id})");pg.wait_for_timeout(300)
    print('postes proposés:',pg.evaluate("[...document.querySelectorAll('#e_fonctionId option')].map(o=>o.text).join(' | ')"))
    pg.select_option('#e_division','__add__');pg.wait_for_timeout(300);pg.fill('#x_nom','Division des soins infirmiers');pg.click('[data-act=addOk]');pg.wait_for_timeout(300)
    pg.select_option('#e_unite','__add__');pg.wait_for_timeout(300);pg.fill('#x_nom','Unité de déchocage');pg.click('[data-act=addOk]');pg.wait_for_timeout(300)
    pg.select_option('#e_fonctionId',label="Chef d'unité");pg.locator('#layer [role=dialog]').screenshot(path='/tmp/dv1.png')
    pg.click('[data-act=editOk]');pg.wait_for_timeout(400)
    print(pg.evaluate("(()=>{const a=DB.agents.find(x=>x.prenom==='Awa'&&x.nom==='Diop')||DB.agents[0];const af=DB.affectations.filter(z=>z.agentId===a.id&&!z.fin)[0];return [a.division,a.unite,fnom(a),af&&DB.fonctions.find(f=>f.id===af.fonctionId).nom].join(' | ')})()"))
    pg.evaluate("const a=DB.agents.find(x=>x.prenom==='Awa'&&x.nom==='Diop')||DB.agents[0];S.page='agent';S.agentId=a.id;ACT.agent({id:a.id})");pg.wait_for_timeout(400)
    pg.locator('h2:has-text("Fiche de poste")').locator('xpath=ancestor::div[contains(@class,"card")][1]').screenshot(path='/tmp/dv2.png')
    print('erreurs',errs);b.close()
