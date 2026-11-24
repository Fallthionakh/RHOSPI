const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync(process.argv[2],'utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const ctx={console,setTimeout,clearTimeout,lib:require("jspdf"),fs,Buffer};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){DB=seed(new Date());index();S.profil={role:'rh'};const a=DB.agents[4];
mouvement(a.id,'MAT',a.posteId,today(),'Redéploiement','1234','F2');DB.documents.push({id:'d1',agentId:a.id,type:'Note de service',titre:'Note de service n° 1234',nom:'note_1234.pdf',mime:'application/pdf',taille:182000,mouvementId:'',par:'Chef RH',t:new Date().toISOString()});
const doc=resumePDF(a,lib);fs.writeFileSync('/tmp/resume.pdf',Buffer.from(doc.output('arraybuffer')));
S.agentId=a.id;const h=PAGES.agent();return 'pages PDF '+doc.getNumberOfPages()+' ; fiche docs '+h.includes('note_1234.pdf')+' ; bouton résumé '+h.includes('Télécharger le résumé')}`,ctx);console.log(ctx.T());
