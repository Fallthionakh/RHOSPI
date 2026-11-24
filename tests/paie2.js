const fs=require('fs'),vm=require('vm');
const js=fs.readFileSync(process.argv[2],'utf8').match(/<script>\n"use strict";([\s\S]*)<\/script>/)[1];
const el=()=>({innerHTML:'',value:'',style:{},dataset:{},checked:false});
const ctx={console,setTimeout,clearTimeout,setInterval:()=>0,lib:require('jspdf'),fs,Buffer,document:{querySelector:el,querySelectorAll:()=>[],getElementById:()=>null,addEventListener(){},createElement:el,body:{appendChild(){}}}};vm.createContext(ctx);
vm.runInContext(js+`;globalThis.T=function(){const out=[],ok=(n,c)=>out.push((c?'OK  ':'FAIL ')+n);
toast=function(){};render=function(){};DB=seed(new Date());index();S.profil={role:'rh'};const T=today(),ym=T.slice(0,7),A=DB.agents;S.rem.ym=ym;
const act=A.filter(a=>enPoste(a,T));
ok('rubriques dans l\\'ordre du tableau : '+DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false).map(recapLab).join(', '),DB.rubriques.filter(r=>r.type==='gain'&&r.actif!==false).map(recapLab).slice(0,5).join()==='Salaire,Motiv,Transp,Risque,Garde');
ok('indemnité de logement désactivée',DB.rubriques.find(r=>r.id==='logement').actif===false);
const props=act.filter(a=>Object.values(LEG).some(k=>estDef(a[k]))||Object.keys(a.paie||{}).length);ok('agents d\\'exemple : plus aucun élément propre ('+props.length+')',props.length===0);
ok('salaire de base : vient de la grille de la catégorie',act.every(a=>sourceRub(a,rubBase()).src==='cat'&&salBase(a)>0));
const inf=act.find(a=>a.posteId==='INF'&&a.fonctionId==='F1'),maj=act.find(a=>a.fonctionId==='F3'&&a.posteId==='MAJ');
ok('infirmier : risque par catégorie, motivation commune',sourceRub(inf,DB.rubriques.find(r=>r.id==='risque')).src==='cat'&&sourceRub(inf,DB.rubriques.find(r=>r.id==='motiv')).src==='commun');
ok('major : prime de responsabilité par le poste',sourceRub(maj,DB.rubriques.find(r=>r.id==='resp')).src==='poste');
// migration sûre de données saisies à la main
const old=JSON.parse(JSON.stringify(DB));delete old.paieV2;old.grille={cat:{},fonc:{}};old.agents.forEach((a,i)=>{if(a.posteId==='AS'){a.salaireBase=i===A.findIndex(z=>z.posteId==='AS')?150000:120000}});
const avant=Object.fromEntries(old.agents.map(a=>[a.id,a.salaireBase]));migrate(old);
const asA=old.agents.filter(a=>a.posteId==='AS');ok('migration : montant le plus fréquent → grille (120 000), exception conservée (150 000)',old.grille.cat.AS.base===120000&&asA.filter(a=>estDef(a.salaireBase)).length===1&&asA.find(a=>estDef(a.salaireBase)).salaireBase===150000);
// niveaux
const b0=bulletin(inf,ym).brut;DB.rubriques.find(r=>r.id==='transp').montant=20000;ok('commun : transport 20 000 pour tous',bulletin(inf,ym).brut===b0+3500);
setPropre(inf,'transp',0);ok('propre à 0 l\\'emporte sur le commun',montantRub(bulletin(inf,ym),'transp')===0);setPropre(inf,'transp',null);ok('retour à la grille',montantRub(bulletin(inf,ym),'transp')===20000);
// tableau récapitulatif
let r=setMontant(inf,ym,'risque',50000),b=bulletin(inf,ym);ok('tableau : risque 50 000 → bulletin modifié, retenues recalculées',r.ok&&b.statut==='modifié'&&montantRub(b,'risque')===50000&&b.ret[0][1]===Math.round(b.brut*0.06));
ok('tableau : trace au journal',DB.journalPaie[0].detail.includes('tableau récapitulatif')&&DB.journalPaie[0].par);
const n=A.find(a=>!estDemo(a))||null;const nv={id:'777',mat:'777',prenom:'Test',nom:'Nouveau',sexe:'F',serviceId:'URG',posteId:'MED',fonctionId:'F1',situation:'en activité',entree:'2020-01-01',pin:'1234'};A.push(nv);DB.grille.cat.MED.base=0;
ok('agent sans salaire : saisie directe crée le bulletin',(setMontant(nv,ym,'base',400000).ok)&&bulletin(nv,ym).brut>=400000&&bulletin(nv,ym).ret.length===4);DB.grille.cat.MED.base=450000;A.pop();
// arrêt de la paie
S.profil={role:'rh'};const ms=moisAArreter(ym);ok('mois à arrêter : janvier à '+moisLib(ym)+' ('+ms.length+')',ms.length===+ym.slice(5)&&ms[0].endsWith('-01'));
const nb=arreterPaie(ms);ok('arrêt : '+nb+' bulletins archivés',nb>300&&ms.every(m=>DB.paieArretee[m])&&bulletinsMois(ym).every(z=>z.b.statut==='archivé'));
const fige=bulletin(maj,ym).brut;DB.grille.fonc.F3.resp=99000;DB.rubriques.find(r=>r.id==='motiv').montant=45000;ok('après l\\'arrêt : bulletins archivés inchangés',bulletin(maj,ym).brut===fige);
const nx=addDays(moisBornes(ym).au,1).slice(0,7);ok('mois suivant : nouveaux montants appliqués',montantRub(bulletin(maj,nx),'resp')===99000&&montantRub(bulletin(maj,nx),'motiv')===45000);
ok('tableau : bulletin archivé non modifiable',!setMontant(inf,ym,'risque',1).ok);
ok('plus rien à arrêter',moisAArreter(ym).length===0&&arretBtn(ym)==='');
S.profil=profils()[0];S.rem.tab='recap';const h=PAGES.remun();ok('page récapitulatif : colonnes et arrêt affichés',['Date et lieu de naissance','Situation matrimoniale','Catég','Motiv','Transp','Garde','Brut','arrêtée'].every(x=>h.includes(x))&&!h.includes('undefined')&&!h.includes('NaN'));
S.rem.tab='rub';const g=PAGES.remun();ok('page rubriques et grilles',['1 · Rubriques','2 · Grille par catégorie','3 · Primes par poste','4 · Éléments propres'].every(x=>g.includes(x))&&!g.includes('undefined'));
S.rem.tab='bul';S.rem.agentId=inf.id;S.rem.ym=nx;const f=PAGES.remun();ok('bulletin : origine de chaque montant affichée',f.includes('grille de la catégorie Infirmier')&&f.includes('commun à tous'));
S.agentId=inf.id;ok('fiche agent : catég, lieu et origine',PAGES.agent().includes('Catégorie de classement')&&PAGES.agent().includes('· catégorie'));
const D=S.recapD=recapDonnees();S.rem.ym=ym;const t=recapTSV(recapDonnees());fs.writeFileSync('/tmp/recap.csv',t.map(r=>r.join(';')).join('\\n'));
return out.join('\\n')}`,ctx);console.log(ctx.T());
