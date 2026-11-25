from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');pg=b.new_page(viewport={'width':1300,'height':900});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T15:30:00");pg.goto(html);pg.wait_for_timeout(800)
    pg.evaluate("S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='superadmin');DB.listes.divisions=['SIM'];const a=DB.agents.find(x=>x.prenom==='Awa'&&x.nom==='Diop');a.division='SIM';save();S.page='agents';render();ACT.edit({k:'posteOcc',id:a.id})");pg.wait_for_timeout(300)
    pg.select_option('#e_cellule','__add__');pg.wait_for_timeout(200);pg.fill('#x_nom','Cellule informatique');pg.click('[data-act=addOk]');pg.wait_for_timeout(200)
    print('cellule choisie:',pg.input_value('#e_cellule'))
    pg.select_option('#e_division','__gerer__');pg.wait_for_timeout(200);pg.fill('#og_0','Division du système d\'information médicale');pg.fill('#og_new','Division des soins');pg.click('[data-act=orgAjout][data-k=division]');pg.wait_for_timeout(150)
    pg.fill('#og_0','Division du système d\'information médicale');pg.locator('#layer2 [role=dialog]').screenshot(path='/tmp/ce1.png');pg.click('[data-act=orgOk]');pg.wait_for_timeout(200)
    print('options division:',pg.evaluate("[...document.querySelectorAll('#e_division option')].map(o=>o.text).join(' | ')"),'| choisie:',pg.input_value('#e_division'))
    pg.locator('#layer [role=dialog]').screenshot(path='/tmp/ce2.png');pg.click('[data-act=editOk]');pg.wait_for_timeout(300)
    print(pg.evaluate("(()=>{const a=DB.agents.find(x=>x.prenom==='Awa'&&x.nom==='Diop');return [a.division,a.unite,a.cellule].join(' | ')})()"))
    print('erreurs',errs);b.close()
