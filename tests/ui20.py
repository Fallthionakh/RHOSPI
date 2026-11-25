from playwright.sync_api import sync_playwright
import pathlib
html=pathlib.Path('/home/claude/pointview/index.html').resolve().as_uri()
LIB={'xlsx':'/home/claude/node_modules/xlsx/dist/xlsx.full.min.js','jspdf':'/home/claude/node_modules/jspdf/dist/jspdf.umd.min.js'}
open('/tmp/diplome.pdf','wb').write(b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome');ctx=b.new_context(viewport={'width':1366,'height':900},accept_downloads=True);pg=ctx.new_page()
    pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(path=LIB['xlsx' if 'xlsx' in r.request.url else 'jspdf'],content_type='application/javascript') if ('xlsx' in r.request.url or 'jspdf' in r.request.url) else r.abort())
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.clock.install(time="2026-11-25T10:00:00");pg.goto(html);pg.wait_for_timeout(800)
    AG=pg.evaluate("(()=>{const a=DB.agents.find(x=>!estFonctionnaire(x)&&enPoste(x,today())&&bulletin(x,today().slice(0,7)).brut);return a.id})()")
    def comme(role):
        pg.evaluate(f"S.popPaieVu=true;closeModal();S.profil=profils().find(x=>x.role==='{role}'&&({'true' if role!='agent' else 'x.agentId===\''+AG+'\''}))||Object.assign({{}},profils().find(x=>x.role==='agent'),{{agentId:'{AG}'}});S.page='{'moi' if role=='agent' else 'dashboard'}';render()");pg.wait_for_timeout(300)
    comme('agent')
    print('menu agent:',pg.evaluate("ROLES.agent.menu.map(k=>MENU[k]).join(' | ')"))
    pg.screenshot(path='/tmp/es1.png',full_page=True)
    # réclamation
    pg.click('.tuile[data-act=recNew]');pg.fill('#rc_obj','Prime de garde non payée');pg.fill('#rc_txt','J\'ai fait 3 gardes en octobre, la prime n\'apparaît pas.');pg.set_input_files('#rc_f','/tmp/diplome.pdf');pg.click('[data-act=recOk]');pg.wait_for_timeout(500)
    # prise en charge
    pg.click('[data-act=moiT][data-t=pec]');pg.click('button[data-act=pecDemNew]');pg.select_option('#pq_lien','Enfant');pg.fill('#pq_bp','Moussa');pg.fill('#pq_bn','Ba');pg.select_option('#pq_bs','M');pg.fill('#pq_ba','6');pg.check('.pq_a[value=Consultation]');pg.fill('#pq_m','Fièvre');pg.click('[data-act=pecDemOk]');pg.wait_for_timeout(300)
    # document
    pg.click('[data-act=moiT][data-t=docs]');pg.click('button[data-act=docNewMoi]');pg.fill('#dmo_ti','Diplôme d\'État');pg.set_input_files('#dmo_f','/tmp/diplome.pdf');pg.click('[data-act=docMoiOk]');pg.wait_for_timeout(500)
    print('agent: réclamations',pg.evaluate("DB.reclamations.length"),'demandes PEC',pg.evaluate("DB.pecDem.length"),'documents',pg.evaluate(f"DB.documents.filter(d=>d.agentId==='{AG}').map(d=>d.id.slice(0,7)+':'+d.titre).join(', ')"))
    # RH
    comme('superadmin')
    pg.evaluate("S.page='reclam';render()");pg.wait_for_timeout(300);pg.click('[data-act=recTraiter]');pg.select_option('#rt_st','traitée');pg.fill('#rt_txt','Vérifié : régularisation sur la paie de novembre.');pg.click('[data-act=recRep]');pg.wait_for_timeout(300)
    pg.evaluate("S.page='pec';render()");pg.wait_for_timeout(300);pg.screenshot(path='/tmp/es2.png')
    pg.click('[data-act=pecDemVal]');pg.wait_for_timeout(300)
    pg.select_option('#pc_l_svc',index=1);pg.wait_for_timeout(100);pg.select_option('#pc_l_acte',index=1);pg.fill('#pc_l_pu','5000');pg.click('[data-act=pecAdd]');pg.wait_for_timeout(200);pg.click('[data-act=pecOk]');pg.wait_for_timeout(400)
    print('PEC demande:',pg.evaluate("DB.pecDem[0].statut+' → bulletin '+(DB.pec.find(x=>x.id===DB.pecDem[0].pecId)||{}).num"))
    # congé : agent demande une permission puis RH approuve
    pg.evaluate(f"DB.absences.push({{id:uid(),agentId:'{AG}',type:'Permission',debut:'2026-12-02',fin:'2026-12-03',motif:'Baptême',statut:'demandée',par:'agent'}});save()")
    pg.evaluate(f"const x=DB.absences.find(z=>z.agentId==='{AG}'&&z.motif==='Baptême');ACT.absSt({{id:x.id}})");pg.wait_for_timeout(200)
    pg.evaluate("ACT.paieArretOk({m:today().slice(0,7)})");pg.wait_for_timeout(300)
    comme('agent')
    print('messages non lus:',pg.evaluate("msgN()"),pg.evaluate(f"DB.messages.filter(m=>m.agentId==='{AG}').map(m=>m.titre).join(' | ')"))
    pg.evaluate("S.page='messages';render()");pg.wait_for_timeout(200);pg.screenshot(path='/tmp/es3.png')
    pg.locator('.msg').first.click();pg.wait_for_timeout(300);print('après clic : page',pg.evaluate("S.page+' '+(S.moiT||'')"),'non lus',pg.evaluate("msgN()"))
    pg.evaluate("S.page='moi';S.moiT='pec';render()");pg.wait_for_timeout(200)
    with pg.expect_download() as d: pg.click('button[data-act=pecDl]')
    print('PEC PDF:',d.value.suggested_filename)
    pg.evaluate("S.page='remun';render()");pg.wait_for_timeout(300);pg.screenshot(path='/tmp/es4.png',full_page=True)
    for act in ['moiPaiePdf','moiPaieXls','moiBulAn']:
        with pg.expect_download() as d: pg.click(f'[data-act={act}]')
        print(act,'→',d.value.suggested_filename)
    pg.set_viewport_size({'width':390,'height':844});pg.evaluate("S.page='moi';S.moiT='accueil';render()");pg.wait_for_timeout(300);pg.screenshot(path='/tmp/es5.png')
    print('erreurs:',errs);b.close()
