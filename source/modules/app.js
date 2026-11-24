/* POINTVIEW — interface et règles métier. Le calcul des présences est dans engine.js. */
(function () {
'use strict';
const E = window.PV;
const $ = s => document.querySelector(s);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const fD = s => s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '—';
const fT = x => { if (!x) return '—'; const d = new Date(x); return E.pad(d.getHours()) + ':' + E.pad(d.getMinutes()); };
const fDT = x => x ? fD(E.d2s(new Date(x))) + ' ' + fT(x) : '—';
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const mois = d => d.slice(0, 7), jj = d => d.slice(8, 10);
const byNom = (a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom);

/* ---------- État ---------- */
const S = { services: {}, postes: {}, agents: {}, vacations: {}, mouvements: {}, absences: {}, planning: {}, pointages: {}, audit: {}, traitements: {}, config: {} };
const COLS = ['services', 'postes', 'agents', 'vacations', 'mouvements', 'absences'];
const CFG0 = { etab: 'Centre hospitalier', tolerance: 10, delaiAbsence: 30, seuilDepart: 15, delaiDepart: 60, seuilRetardAlerte: 30, pinObligatoire: 'oui', feries: '' };
let db = null, userCap = null, persist = false, demo = true, dbState = 'attente', me = { id: null }, NAMES = {}, loadedMonths = new Set(), unsub = null;
const UI = { view: 'dashboard', role: 'superadmin', svc: '', agent: '', date: E.today(), fSvc: '', fPole: '', q: '', ptTab: 'table', ptAll: false,
  k: { mat: '', aid: null, err: '', done: null }, week: E.today(), planSvc: '', absF: '', rp: { type: 'agent', agent: '', svc: '', from: E.today().slice(0, 8) + '01', to: E.today() }, ficheTab: 'id', admTab: 'droits' };
try { const p = JSON.parse(localStorage.getItem('pointview-ui') || '{}'); ['role', 'svc', 'agent', 'view'].forEach(k => { if (p[k]) UI[k] = p[k]; }); } catch (e) {}
const remember = () => { try { localStorage.setItem('pointview-ui', JSON.stringify({ role: UI.role, svc: UI.svc, agent: UI.agent, view: UI.view })); } catch (e) {} };

const ROLES = { superadmin: 'Super administrateur', directeur: 'Directeur', saf: 'Chef SAF', rh: 'Chef RH', chef: 'Chef de service', major: 'Major', agent: 'Agent' };
const MENU = [['dashboard', 'Tableau de bord', 'grid'], ['pointage', 'Pointage', 'clock'], ['planning', 'Planning', 'cal'], ['agents', 'Agents', 'users'], ['services', 'Services', 'build'],
  ['postes', 'Postes', 'badge'], ['mouvements', 'Affectations et mouvements', 'swap'], ['absences', 'Absences et congés', 'leave'], ['rapports', 'Rapports et statistiques', 'chart'],
  ['alertes', 'Alertes', 'bell'], ['admin', 'Administration', 'shield'], ['parametres', 'Paramètres', 'gear'], ['moi', 'Mon espace', 'user']];
const ACCESS = {
  superadmin: ['dashboard', 'pointage', 'planning', 'agents', 'services', 'postes', 'mouvements', 'absences', 'rapports', 'alertes', 'admin', 'parametres'],
  directeur: ['dashboard', 'agents', 'absences', 'rapports', 'alertes'],
  saf: ['dashboard', 'absences', 'rapports', 'alertes'],
  rh: ['dashboard', 'agents', 'services', 'postes', 'mouvements', 'absences', 'rapports', 'alertes'],
  chef: ['dashboard', 'pointage', 'planning', 'agents', 'absences', 'rapports', 'alertes'],
  major: ['pointage', 'planning', 'absences', 'alertes'],
  agent: ['moi', 'pointage']
};
/* Qui peut modifier quoi */
const EDIT = { agents: ['superadmin', 'rh'], services: ['superadmin', 'rh'], postes: ['superadmin', 'rh'], vacations: ['superadmin'], mouvements: ['superadmin', 'rh'],
  planning: ['superadmin', 'chef', 'major'], pointer: ['superadmin', 'chef', 'major'], corriger: ['superadmin', 'chef', 'rh'], valider: ['superadmin', 'chef', 'rh', 'directeur'],
  absDemande: ['superadmin', 'rh', 'chef', 'major', 'agent'], absValider: ['superadmin', 'rh', 'chef', 'directeur'], config: ['superadmin'] };
const can = k => (EDIT[k] || []).includes(UI.role);
const ABS = [['conge', 'Congé annuel', 'conge'], ['permission', 'Permission', 'permission'], ['maladie', 'Absence pour maladie', 'absence_j'], ['exceptionnelle', 'Autorisation exceptionnelle', 'absence_j'],
  ['non_autorisee', 'Absence non autorisée', 'absence_nj'], ['formation', 'Formation', 'absence_j'], ['mission', 'Mission', 'absence_j'], ['autre', 'Autre motif', 'absence_j']];
const absType = id => ABS.find(t => t[0] === id) || ABS[7];
const PILL = { present: 'ok', retard: 'warn', depart_anticipe: 'warn', incomplet: 'warn', hors_planning: 'warn', absent_presume: 'crit', absence_nj: 'crit', absence_j: 'info', conge: 'info', permission: 'info' };

const ICO = { grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  users: 'M8 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 100-6M16 15c3 0 6 2 6 5', build: 'M4 21V5l8-2v18M12 9l8 2v10M2 21h20M7 8h2M7 12h2M7 16h2M15 14h2M15 18h2',
  badge: 'M5 4h14v16H5zM9 9h6M9 13h6M9 17h3', swap: 'M4 8h14l-3-3M20 16H6l3 3', leave: 'M4 20V6l8-3v17M12 6h8v14H4M9 12h.01', chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20h4', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6' };
const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICO[n]}"/></svg>`;

/* ---------- Persistance ---------- */
const queues = {};
function qwrite(key, fn) {
  const run = () => fn().catch(e => { if (e && e.code === 'unavailable') return new Promise(r => setTimeout(r, 900)).then(fn); throw e; });
  const p = (queues[key] || Promise.resolve()).then(run).catch(e => { toast('Enregistrement impossible : ' + ((e && (e.message || e.code)) || 'erreur') + '.', true); });
  queues[key] = p; return p;
}
function put(col, id, data) { S[col][id] = data; return persist ? qwrite(col + '/' + id, () => db.doc(col + '/' + id).set(data)) : Promise.resolve(); }
function deepMerge(a, b) { const o = Object.assign({}, a); Object.keys(b).forEach(k => { const v = b[k]; o[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? deepMerge((a && typeof a[k] === 'object' && a[k]) || {}, v) : v; }); return o; }
function patch(col, id, base, pat) {
  const had = !!S[col][id]; S[col][id] = deepMerge(S[col][id] || base, pat); const full = S[col][id];
  if (!persist) return Promise.resolve();
  return qwrite(col + '/' + id, () => had ? db.doc(col + '/' + id).update(pat).catch(e => { if (e && e.code === 'invalid_argument') return db.doc(col + '/' + id).set(full); throw e; }) : db.doc(col + '/' + id).set(full));
}
const par = () => ({ id: me.id || null, role: UI.role });
const who = p => { if (!p) return '—'; const n = p.id && NAMES[p.id]; return (ROLES[p.role] || p.role || '—') + (n ? ' · ' + n : ''); };
function log(action, detail) { const d = E.today(); return patch('audit', d, { date: d, ev: {} }, { ev: { [uid()]: { t: new Date().toISOString(), par: par(), action, detail: detail || '' } } }); }
async function cap(n) { try { return (window.claude && window.claude.use) ? await window.claude.use(n) : null; } catch (e) { return null; } }
async function hashPin(mat, pin) {
  const txt = 'pointview|' + String(mat).trim().toLowerCase() + '|' + pin;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16); }
}

/* ---------- Accès aux données ---------- */
const nomA = a => a ? a.prenom + ' ' + a.nom : '—';
const svcN = id => (S.services[id] && S.services[id].nom) || '—';
const posN = id => (S.postes[id] && S.postes[id].intitule) || '—';
function agentSvc(a, date) { const t = a.temp; return (t && t.serviceId && t.debut <= date && (!t.fin || date <= t.fin)) ? t.serviceId : a.serviceId; }
function agentsOf(svcIds, date) { return Object.values(S.agents).filter(a => a.situation !== 'sorti des effectifs' && (!svcIds || svcIds.includes(agentSvc(a, date || E.today())))).sort(byNom); }
const rec = (aid, date) => { const d = S.pointages[aid + '_' + mois(date)]; return (d && d.jours && d.jours[jj(date)]) || null; };
const setRec = (aid, date, p) => patch('pointages', aid + '_' + mois(date), { agentId: aid, mois: mois(date), jours: {} }, { jours: { [jj(date)]: p } });
const planVac = (aid, date) => { const d = S.planning[aid + '_' + mois(date)]; const v = d && d.jours && d.jours[jj(date)]; return v ? (S.vacations[v] || null) : null; };
const setPlan = (aid, date, vid) => patch('planning', aid + '_' + mois(date), { agentId: aid, mois: mois(date), jours: {} }, { jours: { [jj(date)]: vid || '' } });
function absOf(aid, date) {
  for (const a of Object.values(S.absences)) {
    if (a.agentId !== aid || a.debut.slice(0, 10) > date || a.fin.slice(0, 10) < date) continue;
    const cat = absType(a.type)[2];
    if (a.statut === 'approuvée' || (cat === 'absence_nj' && a.statut === 'demandée')) return { cat, a };
  }
  return null;
}
const ev = (a, date, now) => E.evalJour({ date, vac: planVac(a.id, date), rec: rec(a.id, date), abs: absOf(a.id, date), now: now || new Date(), cfg: S.config });
const svcList = () => Object.values(S.services).filter(s => s.actif !== 'non').sort((a, b) => a.nom.localeCompare(b.nom));
function scopeIds() {
  if (UI.role === 'chef' || UI.role === 'major') { if (!S.services[UI.svc]) UI.svc = (svcList()[0] || {}).id || ''; return [UI.svc]; }
  if (UI.fSvc && S.services[UI.fSvc]) return [UI.fSvc];
  if (UI.fPole) return svcList().filter(s => s.pole === UI.fPole).map(s => s.id);
  return null;
}
function pill(r) {
  let l = E.LABELS[r.code] || r.code; if (r.garde && r.code === 'present') l = 'En garde';
  if (r.retard && (r.code === 'retard' || r.code === 'depart_anticipe')) l += ' · retard ' + E.fmtMin(r.retard);
  if (r.anticipe) l += ' · −' + E.fmtMin(r.anticipe);
  return `<span class="pill ${PILL[r.code] || ''}">${esc(l)}</span>`;
}
function dayStats(date, ids) {
  const now = new Date(), L = { actifs: [], attendus: [], echus: [], presents: [], retards: [], absents: [], conges: [] };
  agentsOf(ids, date).forEach(a => { const r = ev(a, date, now), it = { a, r }; L.actifs.push(it);
    if (r.attendu) { L.attendus.push(it); if (r.code !== 'a_venir' && r.code !== 'attendu') L.echus.push(it); }
    if (r.pointe) L.presents.push(it); if (r.retard) L.retards.push(it);
    if (r.code === 'absent_presume' || r.code === 'absence_nj') L.absents.push(it);
    if (['conge', 'permission', 'absence_j'].includes(r.code)) L.conges.push(it); });
  const pr = L.echus.filter(x => x.r.pointe).length;
  L.taux = L.echus.length ? Math.round(1000 * pr / L.echus.length) / 10 : null;
  return L;
}
/* Effectifs d'un service : affecté, programmé, présent sur site, minimum requis, manquant. */
function staffing(svc, date) {
  const t = E.today(), now = new Date(), ags = agentsOf([svc.id], date); let prog = 0, pres = 0, enCours = 0;
  ags.forEach(a => { const r = ev(a, date, now);
    if (r.start && !['conge', 'permission', 'absence_j'].includes(r.code)) prog++;
    if (date === t) { let open = false, cours = false;
      [date, E.addDays(date, -1)].forEach(d => { const x = d === date ? r : ev(a, d, now), rc = rec(a.id, d);
        if (x.start && x.start <= now && now < x.end) cours = true;
        if (rc && rc.arr && !rc.dep && (d === date || (x.end && now < new Date(x.end.getTime() + 3600000)))) open = true; });
      if (open) pres++; if (cours) enCours++;
    } else if (r.pointe) pres++; });
  const min = +svc.effMin || 0; let manquant = 0;
  if (min > 0) { if (date > t) manquant = Math.max(0, min - prog); else if (date < t || enCours > 0 || prog === 0) manquant = Math.max(0, min - pres); }
  return { affecte: ags.length, prog, pres, enCours, min, manquant, sous: manquant > 0 };
}
/* Alertes calculées à partir des données, jamais transformées en sanction. */
function alerts() {
  const t = E.today(), y = E.addDays(t, -1), dm = E.addDays(t, 1), now = new Date(), out = [], ids = scopeIds();
  const add = (prio, type, key, texte, svcId, date, quand) => { const s = S.services[svcId] || {}; const tr = S.traitements[date] && S.traitements[date].items && S.traitements[date].items[key];
    out.push({ prio, type, key, date, texte, svc: s.nom || '—', dest: s.major || s.responsable || 'Responsable du service', quand: quand || now, traite: tr || null }); };
  agentsOf(ids, t).forEach(a => { const sid = agentSvc(a, t);
    [t, y].forEach(d => { const r = ev(a, d, now), n = nomA(a);
      if (r.code === 'absent_presume') add(1, 'Arrivée non enregistrée', 'abs_' + a.id, `${n} était attendu(e) à ${fT(r.start)} le ${fD(d)} et n'a pas pointé.`, sid, d, r.start);
      if (r.retard >= (+S.config.seuilRetardAlerte || 30)) add(2, 'Retard important', 'ret_' + a.id, `${n} : retard de ${E.fmtMin(r.retard)} le ${fD(d)}.`, sid, d, r.start);
      if (r.anticipe) add(2, 'Départ anticipé', 'ant_' + a.id, `${n} est parti(e) ${E.fmtMin(r.anticipe)} avant la fin de vacation le ${fD(d)}.`, sid, d, r.end);
      if (r.code === 'incomplet') add(2, 'Départ non pointé', 'inc_' + a.id, `${n} : aucun départ enregistré pour la vacation du ${fD(d)}.`, sid, d, r.end);
      if (r.code === 'hors_planning') add(3, 'Pointage hors planning', 'hp_' + a.id, `${n} a pointé le ${fD(d)} sans être programmé(e).`, sid, d); });
    const ry = ev(a, y, now), rt = ev(a, t, now);
    if (ry.end && rt.start && ry.end > rt.start) add(2, 'Chevauchement de vacations', 'chev_' + a.id, `${nomA(a)} : la vacation du ${fD(y)} se termine après le début de celle du ${fD(t)}.`, sid, t);
    let nr = 0; for (let i = 0; i < 7; i++) if (ev(a, E.addDays(t, -i), now).retard) nr++;
    if (nr >= 3) add(3, 'Retards répétés', 'rep_' + a.id, `${nomA(a)} : ${nr} retards sur les 7 derniers jours. À aborder avec l'agent.`, sid, t);
    const ab = absOf(a.id, dm); const vd = planVac(a.id, dm);
    if (ab && ab.a.statut === 'approuvée' && vd && vd.travail !== false && !ab.a.remplacant) add(3, 'Absence sans remplaçant', 'rmp_' + a.id, `${nomA(a)} est absent(e) demain (${absType(ab.a.type)[1]}) sans remplaçant désigné.`, sid, dm);
  });
  svcList().filter(s => !ids || ids.includes(s.id)).forEach(s => {
    const st = staffing(s, t); if (st.sous) add(1, 'Sous-effectif', 'sous_' + s.id, `${s.nom} : ${st.pres} présent(s) pour un minimum de ${st.min}. Il manque ${st.manquant} agent(s).`, s.id, t);
    const sd = staffing(s, dm); if (sd.sous) add(sd.prog === 0 ? 1 : 2, sd.prog === 0 ? 'Vacation non couverte demain' : 'Risque de sous-effectif demain', 'dem_' + s.id, `${s.nom} : ${sd.prog} agent(s) programmé(s) demain pour un minimum de ${sd.min}.`, s.id, dm);
  });
  return out.sort((a, b) => (a.traite ? 1 : 0) - (b.traite ? 1 : 0) || a.prio - b.prio);
}

/* ---------- Composants ---------- */
let toastT = null;
function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, err ? 6000 : 3200); }
function openModal(title, html, narrow) { const m = $('#modal'); m.innerHTML = `<div class="box ${narrow ? 'narrow' : ''}"><div class="head"><h2>${esc(title)}</h2><button class="btn sm" data-a="closeModal" aria-label="Fermer">Fermer</button></div>${html}</div>`; m.classList.add('open'); const f = m.querySelector('input:not([type=hidden]),select,textarea'); if (f) f.focus(); }
function closeModal() { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; }
const opts = (list, v) => list.map(o => { const a = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(a[0])}" ${String(a[0]) === String(v == null ? '' : v) ? 'selected' : ''}>${esc(a[1])}</option>`; }).join('');
function field(f, v) {
  v = v == null ? (f.def == null ? '' : f.def) : v; const id = 'f_' + f.k, rq = f.req ? 'required' : ''; let inp;
  if (f.type === 'select') inp = `<select id="${id}" name="${f.k}" ${rq}>${opts(f.opt || [], v)}</select>`;
  else if (f.type === 'textarea') inp = `<textarea id="${id}" name="${f.k}" ${rq}>${esc(v)}</textarea>`;
  else inp = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}" ${rq} ${f.attr || ''}>`;
  return `<label class="field ${f.wide ? 'wide' : ''}" for="${id}"><span>${esc(f.label)}${f.req ? ' *' : ''}</span>${inp}</label>`;
}
const formHtml = (name, fields, data, hidden, okLabel) => `<form data-form="${name}" class="form">${Object.entries(hidden || {}).map(([k, v]) => `<input type="hidden" name="${k}" value="${esc(v)}">`).join('')}<div class="grid2">${fields.map(f => field(f, data && data[f.k])).join('')}</div><div class="actions"><button type="button" class="btn" data-a="closeModal">Annuler</button><button class="btn primary">${okLabel || 'Enregistrer'}</button></div></form>`;
const svcOpt = blank => (blank ? [['', blank]] : []).concat(svcList().map(s => [s.id, s.nom]));
const posOpt = () => [['', '— Choisir —']].concat(Object.values(S.postes).filter(p => p.actif !== 'non').sort((a, b) => a.intitule.localeCompare(b.intitule)).map(p => [p.id, p.intitule]));
const agOpt = (ids, blank) => (blank ? [['', blank]] : []).concat(agentsOf(ids).map(a => [a.id, a.matricule + ' · ' + nomA(a)]));
const vacOpt = () => Object.values(S.vacations).filter(v => v.actif !== 'non').sort((a, b) => a.code.localeCompare(b.code));
function table(heads, rows, cls) { return `<div class="tw"><table class="${cls || ''}"><thead><tr>${heads.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.join('') : `<tr><td colspan="${heads.length}" class="muted">Aucune donnée à afficher.</td></tr>`}</tbody></table></div>`; }
function listModal(title, items) {
  openModal(title, table(['Matricule', 'Agent', 'Service', 'Vacation', 'Prévu', 'Réel', 'Statut'], items.map(({ a, r }) => { const rc = rec(a.id, UI.date) || {}, v = planVac(a.id, UI.date);
    return `<tr><td data-l="Matricule">${esc(a.matricule)}</td><td data-l="Agent"><b>${esc(nomA(a))}</b></td><td data-l="Service">${esc(svcN(agentSvc(a, UI.date)))}</td><td data-l="Vacation">${v ? esc(v.code) : '—'}</td><td data-l="Prévu">${r.start ? fT(r.start) + '–' + fT(r.end) : '—'}</td><td data-l="Réel">${fT(rc.arr)}${rc.dep ? '–' + fT(rc.dep) : ''}</td><td data-l="Statut">${pill(r)}</td></tr>`; }), 'resp'));
}

/* ---------- Vues ---------- */
const V = {};
function header(title, sub, extra) {
  return `<div class="top"><button class="btn" id="menuBtn" data-a="menu" aria-label="Ouvrir le menu">Menu</button><h1>${esc(title)}</h1>${extra || ''}${sub ? `<div class="sub">${sub}</div>` : ''}</div>${bannerHtml()}`;
}
function bannerHtml() {
  if (!demo) return dbState === 'lecture' ? `<div class="banner"><span>Vous consultez POINTVIEW en lecture seule : vos modifications ne seront pas enregistrées.</span></div>` : '';
  if (dbState === 'vide') return `<div class="banner info"><span><b>Données d'exemple.</b> Ce que vous voyez sert à découvrir l'outil (code PIN des agents fictifs : 1234). Choisissez comment démarrer.</span><button class="btn primary" data-a="startEmpty">Démarrer avec mon établissement</button><button class="btn" data-a="startDemo">Enregistrer ces exemples pour tester</button></div>`;
  return `<div class="banner"><span><b>Données d'exemple, non enregistrées.</b> ${dbState === 'attente' ? 'Connexion à la base en cours…' : 'La base de données n\'est pas accessible depuis cette vue ; ouvrez POINTVIEW connecté à votre compte Claude.'} Code PIN des agents fictifs : 1234.</span></div>`;
}
const dateInput = (k, v) => `<input type="date" id="d_${k}" data-c="${k}" value="${v}" aria-label="Date">`;

V.dashboard = () => {
  const ids = scopeIds(), d = UI.date, L = dayStats(d, ids), svcs = svcList().filter(s => !ids || ids.includes(s.id));
  const st = svcs.map(s => ({ s, e: staffing(s, d), l: dayStats(d, [s.id]) })), sous = st.filter(x => x.e.sous);
  const global = !(UI.role === 'chef' || UI.role === 'major');
  const poles = [...new Set(svcList().map(s => s.pole).filter(Boolean))];
  const filt = global ? `<select data-c="fPole" aria-label="Pôle">${opts([['', 'Tous les pôles']].concat(poles), UI.fPole)}</select><select data-c="fSvc" aria-label="Service">${opts(svcOpt('Tous les services'), UI.fSvc)}</select>` : '';
  const k = (cls, n, lab, key) => `<button class="kpi ${cls}" data-a="kpi" data-k="${key}"><b>${n}</b><span>${lab}</span></button>`;
  const days = E.range(E.addDays(d, -13), d).map(x => ({ x, t: dayStats(x, ids).taux }));
  const W = 560, H = 150, bw = W / days.length;
  const chart = `<svg class="chart" viewBox="0 0 ${W} ${H + 26}" role="img" aria-label="Taux de présence des 14 derniers jours" style="width:100%;height:auto">` +
    [0, 50, 100].map(v => `<line x1="28" x2="${W}" y1="${H - v * H / 100 + 4}" y2="${H - v * H / 100 + 4}" stroke="#D9E3EA"/><text x="0" y="${H - v * H / 100 + 8}">${v}%</text>`).join('') +
    days.map((p, i) => { const h = (p.t || 0) * (H / 100), x = 32 + i * ((W - 32) / days.length); return (p.t == null ? '' : `<rect x="${x}" y="${H - h + 4}" width="${bw - 12}" height="${h}" rx="3" fill="${p.x === d ? '#0E5FA6' : '#8DBDE6'}"><title>${fD(p.x)} : ${p.t}%</title></rect>`) + `<text x="${x + (bw - 12) / 2}" y="${H + 20}" text-anchor="middle">${p.x.slice(8)}</text>`; }).join('') + '</svg>';
  let extra = '';
  if (['superadmin', 'directeur', 'saf', 'rh'].includes(UI.role)) {
    const all = []; agentsOf(ids, d).forEach(a => E.range(d.slice(0, 8) + '01', d).forEach(x => all.push(ev(a, x)))); const sy = E.synthese(all);
    extra = `<div class="card"><h2>Mois en cours, du 1er au ${fD(d)}</h2><div class="ind"><div><b>${E.fmtH(sy.hProg)}</b><span>Heures programmées</span></div><div><b>${E.fmtH(sy.hPres)}</b><span>Heures de présence</span></div><div><b>${E.fmtH(sy.hVal)}</b><span>Heures validées</span></div><div><b>${E.fmtH(sy.hAbsNJ)}</b><span>Heures non effectuées, non justifiées</span></div><div><b>${E.fmtH(sy.hAbsJ)}</b><span>Heures d'absence justifiée</span></div><div><b>${E.fmtH(sy.hSup)}</b><span>Heures supplémentaires validées</span></div><div><b>${sy.nRetards}</b><span>Retards (${E.fmtMin(sy.minRetard)})</span></div><div><b>${sy.jAbsNJ + sy.jPresume}</b><span>Jours d'absence non justifiée ou présumée</span></div></div></div>`;
  }
  const rows = st.sort((a, b) => (b.l.taux == null ? -1 : b.l.taux) - (a.l.taux == null ? -1 : a.l.taux)).map(({ s, e, l }, i) => `<tr class="click" data-a="svcList" data-id="${s.id}" tabindex="0"><td data-l="Rang">${i + 1}</td><td data-l="Service"><b>${esc(s.nom)}</b></td><td data-l="Affecté" class="num">${e.affecte}</td><td data-l="Programmé" class="num">${e.prog}</td><td data-l="Présent" class="num">${e.pres}</td><td data-l="En retard" class="num">${l.retards.length}</td><td data-l="Absent" class="num">${l.absents.length}</td><td data-l="Minimum" class="num">${e.min}</td><td data-l="Manquant" class="num">${e.manquant || '—'}</td><td data-l="Taux" class="num">${l.taux == null ? '—' : l.taux + ' %'}</td><td data-l="État">${e.sous ? '<span class="pill crit">Sous-effectif</span>' : '<span class="pill ok">Couvert</span>'}</td></tr>`);
  const dm = E.addDays(E.today(), 1), risk = svcs.map(s => ({ s, e: staffing(s, dm) })).filter(x => x.e.sous);
  return header(global ? 'Tableau de bord' : 'Tableau de bord · ' + svcN(UI.svc), esc(S.config.etab || '') + ' · situation du ' + fD(d) + (d === E.today() ? ' à ' + fT(new Date()) : ''), filt + dateInput('date', d)) +
    `<div class="stack"><div class="kpis">${k('', L.actifs.length, 'Agents actifs', 'actifs')}${k('', L.attendus.length, 'Attendus ce jour', 'attendus')}${k('ok', L.presents.length, 'Présents (arrivée pointée)', 'presents')}${k('warn', L.retards.length, 'En retard', 'retards')}${k('crit', L.absents.length, 'Absents', 'absents')}${k('mute', L.conges.length, 'Congé, permission, absence justifiée', 'conges')}<button class="kpi static ${L.taux != null && L.taux < 80 ? 'warn' : 'ok'}"><b>${L.taux == null ? '—' : L.taux + ' %'}</b><span>Taux de présence</span></button>${k(sous.length ? 'crit' : 'ok', sous.length, 'Services en sous-effectif', 'sous')}</div>
    <div class="card"><h2>Effectifs par service, classés par taux de présence</h2>${table(['Rang', 'Service', 'Affecté', 'Programmé', 'Présent', 'En retard', 'Absent', 'Minimum', 'Manquant', 'Taux', 'État'], rows, 'resp')}<p class="small muted">Cliquez sur un service ou sur un indicateur pour voir la liste nominative.</p></div>
    <div class="cols"><div class="card"><h2>Taux de présence sur 14 jours</h2>${chart}</div><div class="card"><h2>À anticiper pour demain, ${fD(dm)}</h2>${risk.length ? '<ul>' + risk.map(x => `<li><b>${esc(x.s.nom)}</b> : ${x.e.prog} programmé(s) pour un minimum de ${x.e.min}.</li>`).join('') + '</ul>' : '<p class="muted">Tous les services atteignent leur effectif minimum programmé.</p>'}</div></div>${extra}</div>`;
};

function rowPt(a, date, edit) {
  const r = ev(a, date), rc = rec(a.id, date) || {}, v = planVac(a.id, date);
  const tard = (m, s, t) => (m === 'manuel' && s && t && Math.abs(new Date(s) - new Date(t)) > 30 * 60000) ? '<span class="tag">saisie tardive</span>' : '';
  const b = [];
  if (edit) { if (!rc.arr) b.push(`<button class="btn sm green" data-a="pt" data-k="arr" data-id="${a.id}" data-d="${date}">Arrivée</button>`);
    if (rc.arr && !rc.dep) b.push(`<button class="btn sm primary" data-a="pt" data-k="dep" data-id="${a.id}" data-d="${date}">Départ</button>`);
    if (!rc.arr && !rc.absent && r.start) b.push(`<button class="btn sm danger" data-a="ptAbs" data-id="${a.id}" data-d="${date}">Absent</button>`); }
  b.push(`<button class="btn sm" data-a="ptDetail" data-id="${a.id}" data-d="${date}">Détail</button>`);
  return `<tr><td data-l="Sélection">${edit ? `<input type="checkbox" class="selPt" value="${a.id}" ${rc.arr || rc.absent ? 'disabled' : ''} aria-label="Sélectionner ${esc(nomA(a))}">` : ''}</td><td data-l="Matricule">${esc(a.matricule)}</td><td data-l="Agent"><b>${esc(nomA(a))}</b></td><td data-l="Poste">${esc(posN(a.posteId))}</td><td data-l="Vacation">${v ? esc(v.code + ' · ' + v.nom) : '—'}</td><td data-l="Arrivée prévue">${r.start ? fT(r.start) : '—'}</td><td data-l="Arrivée réelle">${fT(rc.arr)}${tard(rc.arrMode, rc.arrSaisi, rc.arr)}</td><td data-l="Départ prévu">${r.end ? fT(r.end) : '—'}</td><td data-l="Départ réel">${fT(rc.dep)}${tard(rc.depMode, rc.depSaisi, rc.dep)}</td><td data-l="Statut">${pill(r)}</td><td class="acts">${b.join('')}</td></tr>`;
}
V.pointage = () => {
  const mgr = ['superadmin', 'chef', 'major', 'rh'].includes(UI.role); if (!mgr) UI.ptTab = 'borne';
  const tabs = mgr ? `<div class="tabs"><button class="${UI.ptTab === 'table' ? 'on' : ''}" data-a="ptTab" data-k="table">Pointage par le responsable</button><button class="${UI.ptTab === 'borne' ? 'on' : ''}" data-a="ptTab" data-k="borne">Borne de pointage (agent)</button></div>` : '';
  if (UI.ptTab === 'borne') return header('Pointage', 'L\'agent saisit son matricule et son code PIN. L\'heure est celle de l\'appareil au moment du pointage ; elle n\'est pas modifiable.') + tabs + kiosk();
  if (UI.role === 'superadmin' || UI.role === 'rh') { if (!S.services[UI.svc]) UI.svc = (svcList()[0] || {}).id || ''; }
  const sid = scopeIds() && (UI.role === 'chef' || UI.role === 'major') ? UI.svc : UI.svc, d = UI.date, edit = can('pointer');
  const ags = agentsOf([sid], d), now = new Date();
  const shown = ags.filter(a => UI.ptAll || planVac(a.id, d) && planVac(a.id, d).travail !== false || rec(a.id, d));
  const y = E.addDays(d, -1), veille = ags.filter(a => { const rc = rec(a.id, y), r = ev(a, y, now); return rc && rc.arr && !rc.dep && r.end && E.d2s(r.end) >= d; });
  const L = dayStats(d, [sid]), deps = ags.filter(a => (rec(a.id, d) || {}).dep).length;
  const chip = (n, l, c) => `<div class="kpi static ${c}"><b>${n}</b><span>${l}</span></div>`;
  const heads = ['', 'Matricule', 'Nom et prénom', 'Poste', 'Vacation prévue', 'Arrivée prévue', 'Arrivée réelle', 'Départ prévu', 'Départ réel', 'Statut', 'Actions'];
  return header('Pointage', '', (UI.role === 'superadmin' || UI.role === 'rh' ? `<select data-c="svc" aria-label="Service">${opts(svcOpt(), UI.svc)}</select>` : '') + dateInput('date', d)) + tabs +
    `<div class="stack"><div class="kpis">${chip(L.attendus.length, 'Programmés', '')}${chip(L.presents.length, 'Présents', 'ok')}${chip(L.retards.length, 'Retardataires', 'warn')}${chip(L.absents.length, 'Absents', 'crit')}${chip(deps, 'Départs enregistrés', 'mute')}</div>
    <div class="card"><div class="row" style="margin-bottom:10px"><h2 style="margin-right:auto">${esc(svcN(sid))} · ${fD(d)}</h2><label class="small"><input type="checkbox" data-c="ptAll" ${UI.ptAll ? 'checked' : ''}> Afficher aussi les agents non programmés</label>${edit ? '<button class="btn green" data-a="ptBulk">Pointer les agents présents</button>' : ''}</div>
    ${table(heads, shown.map(a => rowPt(a, d, edit)), 'resp')}</div>
    ${veille.length ? `<div class="card"><h2>Vacations commencées la veille, départ à enregistrer</h2>${table(heads, veille.map(a => rowPt(a, y, edit)), 'resp')}</div>` : ''}</div>`;
};
function kioskDate(a) { const t = E.today(), y = E.addDays(t, -1), now = new Date(), ry = rec(a.id, y), ey = ev(a, y, now); return (ry && ry.arr && !ry.dep && ey.end && E.d2s(ey.end) >= t && now < new Date(ey.end.getTime() + 6 * 3600000)) ? y : t; }
function kiosk() {
  const K = UI.k, a = K.aid && S.agents[K.aid]; let body = '';
  if (K.done) body = `<div class="okbox"><span>${K.done.kind === 'arr' ? 'Arrivée enregistrée' : 'Départ enregistré'}</span><b>${fT(K.done.t)}</b><div>${esc(K.done.nom)} · ${fD(E.d2s(new Date(K.done.t)))}</div>${K.done.note ? `<div class="small">${esc(K.done.note)}</div>` : ''}</div><div class="row" style="margin-top:12px"><button class="btn big primary" data-a="kReset">Agent suivant</button></div>`;
  else if (a) { const d = kioskDate(a), r = ev(a, d), rc = rec(a.id, d) || {}, v = planVac(a.id, d);
    body = `<h3 style="margin-bottom:8px">Identification de l'agent</h3><dl><dt>Matricule</dt><dd>${esc(a.matricule)}</dd><dt>Nom et prénom</dt><dd>${esc(nomA(a))}</dd><dt>Service</dt><dd>${esc(svcN(agentSvc(a, d)))}</dd><dt>Poste</dt><dd>${esc(posN(a.posteId))}</dd><dt>Vacation prévue</dt><dd>${v ? esc(v.nom) + (r.start ? ` (${fT(r.start)} – ${fT(r.end)})` : '') : 'Aucune vacation programmée'}</dd></dl>
    <h3 style="margin:14px 0 8px">Pointage du ${fD(d)}</h3><dl><dt>Heure prévue d'arrivée</dt><dd>${r.start ? fT(r.start) : '—'}</dd><dt>Heure réelle d'arrivée</dt><dd>${fT(rc.arr)}</dd><dt>Heure prévue de départ</dt><dd>${r.end ? fT(r.end) : '—'}</dd><dt>Heure réelle de départ</dt><dd>${fT(rc.dep)}</dd><dt>Statut</dt><dd>${pill(r)}</dd></dl>
    ${S.config.pinObligatoire !== 'non' ? `<label class="field" for="kPin" style="margin-top:12px"><span>Code PIN personnel</span><input id="kPin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></label>` : ''}
    ${K.err ? `<div class="errbox" style="margin-top:10px">${esc(K.err)}</div>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn big green" data-a="kPoint" data-k="arr" ${rc.arr ? 'disabled' : ''}>Pointer l'arrivée</button><button class="btn big primary" data-a="kPoint" data-k="dep" ${!rc.arr || rc.dep ? 'disabled' : ''}>Pointer le départ</button></div><div class="row" style="margin-top:10px"><button class="btn" data-a="kReset">Ce n'est pas moi</button></div>`; }
  else body = `<form data-form="kFind"><label class="field" for="kMat"><span>Votre matricule</span><input class="mat" id="kMat" name="mat" value="${esc(K.mat)}" autocomplete="off" required></label>${K.err ? `<div class="errbox" style="margin-top:10px">${esc(K.err)}</div>` : ''}<div class="row" style="margin-top:12px"><button class="btn big primary">Rechercher</button></div></form>`;
  return `<div class="card kiosk"><div class="row" style="margin-bottom:10px"><h2 style="margin-right:auto">Borne de pointage</h2><span class="muted">${fD(E.today())} · ${fT(new Date())}</span></div>${body}</div>`;
}

V.planning = () => {
  if (!S.services[UI.planSvc]) UI.planSvc = (UI.role === 'chef' || UI.role === 'major') ? scopeIds()[0] : (svcList()[0] || {}).id || '';
  if (UI.role === 'chef' || UI.role === 'major') UI.planSvc = scopeIds()[0];
  const sid = UI.planSvc, svc = S.services[sid] || {}, w0 = (() => { const d = E.s2d(UI.week); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return E.d2s(d); })();
  const days = E.range(w0, E.addDays(w0, 6)), ags = agentsOf([sid], w0), vacs = vacOpt(), edit = can('planning'), fer = String(S.config.feries || '');
  const vo = [['', '—']].concat(vacs.map(v => [v.id, v.code]));
  const head = `<tr><th>Agent</th>${days.map(d => `<th class="${[0, 6].includes(E.s2d(d).getDay()) || fer.includes(d) ? 'we' : ''}">${JOURS[E.s2d(d).getDay()]} ${d.slice(8)}${fer.includes(d) ? ' (férié)' : ''}</th>`).join('')}</tr>`;
  const rows = ags.map(a => `<tr><td><b>${esc(nomA(a))}</b><div class="small muted">${esc(posN(a.posteId))}</div></td>${days.map(d => { const cur = (S.planning[a.id + '_' + mois(d)] || { jours: {} }).jours[jj(d)] || '', ab = absOf(a.id, d);
    return `<td class="${[0, 6].includes(E.s2d(d).getDay()) ? 'we' : ''}">${edit ? `<select data-c="plan" data-id="${a.id}" data-d="${d}" aria-label="${esc(nomA(a))} ${d}">${opts(vo, cur)}</select>` : esc((S.vacations[cur] || {}).code || '—')}${ab && ab.a.statut === 'approuvée' ? `<div class="small"><span class="pill info">${esc(absType(ab.a.type)[1])}</span></div>` : ''}</td>`; }).join('')}</tr>`);
  const foot = `<tr><td class="muted">Agents programmés / minimum ${+svc.effMin || 0}</td>${days.map(d => { const e = staffing(svc, d), n = e.prog; return `<td><span class="pill ${n < e.min ? 'crit' : 'ok'}">${n}</span></td>`; }).join('')}</tr>`;
  return header('Planning', 'Un agent en repos, en congé approuvé ou non programmé n\'est jamais compté absent.', ((UI.role === 'chef' || UI.role === 'major') ? '' : `<select data-c="planSvc" aria-label="Service">${opts(svcOpt(), sid)}</select>`) + `<button class="btn" data-a="week" data-k="-7">Semaine précédente</button><button class="btn" data-a="week" data-k="0">Cette semaine</button><button class="btn" data-a="week" data-k="7">Semaine suivante</button>`) +
    `<div class="stack"><div class="card"><div class="row" style="margin-bottom:8px"><h2 style="margin-right:auto">${esc(svc.nom || '—')} · semaine du ${fD(w0)}</h2>${edit ? '<button class="btn" data-a="rotation">Rotation automatique</button><button class="btn" data-a="copyWeek">Copier la semaine précédente</button><button class="btn" data-a="swap">Échange de vacation</button>' : ''}</div>
    <div class="tw"><table class="plan"><thead>${head}</thead><tbody>${rows.join('') || '<tr><td colspan="8" class="muted">Aucun agent affecté à ce service.</td></tr>'}${foot}</tbody></table></div></div>
    <div class="card"><h2>Vacations disponibles</h2><div class="row">${vacs.map(v => `<span class="pill ${v.travail === false ? '' : 'info'}">${esc(v.code)} · ${esc(v.nom)}${v.travail === false ? '' : ' · ' + esc(v.debut) + '–' + esc(v.fin)}</span>`).join('')}</div><p class="small muted">Les horaires se règlent dans Paramètres.</p></div></div>`;
};

const SIT = ['en activité', 'en congé', 'en détachement', 'en disponibilité', 'sorti des effectifs'];
const agentFields = a => [
  { k: 'matricule', label: 'Matricule', req: 1 }, { k: 'prenom', label: 'Prénom', req: 1 }, { k: 'nom', label: 'Nom', req: 1 }, { k: 'sexe', label: 'Sexe', type: 'select', opt: ['F', 'M'] },
  { k: 'naissance', label: 'Date de naissance', type: 'date' }, { k: 'tel', label: 'Téléphone', type: 'tel' }, { k: 'email', label: 'Adresse électronique', type: 'email' }, { k: 'adresse', label: 'Adresse de résidence' },
  { k: 'corps', label: 'Corps d\'appartenance' }, { k: 'categorie', label: 'Catégorie professionnelle' }, { k: 'grade', label: 'Grade' }, { k: 'statutAdm', label: 'Statut administratif', type: 'select', opt: ['Fonctionnaire', 'Contractuel', 'Agent non fonctionnaire', 'Stagiaire', 'Vacataire'] },
  { k: 'dateCorps', label: 'Date d\'entrée dans le corps', type: 'date' }, { k: 'datePrise', label: 'Prise de service dans l\'établissement', type: 'date' },
].concat(a ? [] : [{ k: 'serviceId', label: 'Service', type: 'select', opt: svcOpt(), req: 1 }, { k: 'posteId', label: 'Poste occupé', type: 'select', opt: posOpt() }]).concat([
  { k: 'responsable', label: 'Responsable hiérarchique' }, { k: 'situation', label: 'Situation', type: 'select', opt: SIT }, { k: 'pin', label: a ? 'Nouveau code PIN (laisser vide pour conserver)' : 'Code PIN de pointage (4 à 6 chiffres)', type: 'password', attr: 'inputmode="numeric" maxlength="6" autocomplete="new-password"' }]);
function agentsRows() {
  const ids = scopeIds(), q = UI.q.trim().toLowerCase();
  return Object.values(S.agents).filter(a => (!ids || ids.includes(agentSvc(a, E.today()))) && (!q || (a.matricule + ' ' + a.prenom + ' ' + a.nom).toLowerCase().includes(q))).sort(byNom)
    .map(a => `<tr class="click" data-a="fiche" data-id="${a.id}" tabindex="0"><td data-l="Matricule">${esc(a.matricule)}</td><td data-l="Agent"><b>${esc(nomA(a))}</b></td><td data-l="Poste">${esc(posN(a.posteId))}</td><td data-l="Service">${esc(svcN(a.serviceId))}${agentSvc(a, E.today()) !== a.serviceId ? `<span class="tag">détaché : ${esc(svcN(agentSvc(a, E.today())))}</span>` : ''}</td><td data-l="Corps">${esc(a.corps || '—')}</td><td data-l="Situation"><span class="pill ${a.situation === 'en activité' ? 'ok' : ''}">${esc(a.situation || '—')}</span></td></tr>`);
}
V.agents = () => header('Agents', 'Cliquez sur un agent pour ouvrir son dossier administratif.', `<input type="search" id="agQ" data-i="q" placeholder="Rechercher un nom ou un matricule" value="${esc(UI.q)}" aria-label="Rechercher un agent">` + (['chef', 'major'].includes(UI.role) ? '' : `<select data-c="fSvc" aria-label="Service">${opts(svcOpt('Tous les services'), UI.fSvc)}</select>`) + (can('agents') ? '<button class="btn primary" data-a="agentNew">Nouvel agent</button>' : '')) +
  `<div class="card" id="agList">${table(['Matricule', 'Nom et prénom', 'Poste', 'Service', 'Corps', 'Situation'], agentsRows(), 'resp')}</div>`;
function ficheHtml(a) {
  const t = UI.ficheTab, tabs = [['id', 'Identité et carrière'], ['mvt', 'Affectations et mouvements'], ['abs', 'Absences et congés'], ['pt', 'Pointages et retards']];
  let body = '';
  if (t === 'id') { const L = [['Matricule', a.matricule], ['Sexe', a.sexe], ['Date de naissance', fD(a.naissance)], ['Téléphone', a.tel], ['Adresse électronique', a.email], ['Adresse', a.adresse], ['Corps', a.corps], ['Catégorie', a.categorie], ['Grade', a.grade], ['Statut administratif', a.statutAdm], ['Entrée dans le corps', fD(a.dateCorps)], ['Prise de service', fD(a.datePrise)], ['Service actuel', svcN(a.serviceId)], ['Poste occupé', posN(a.posteId)], ['Depuis le', fD(a.datePoste)], ['Responsable hiérarchique', a.responsable], ['Situation', a.situation], ['Code PIN', a.pinHash ? 'Défini' : 'Non défini']];
    body = `<div class="ind">${L.map(x => `<div><span>${esc(x[0])}</span><b style="font-size:15px">${esc(x[1] || '—')}</b></div>`).join('')}</div><div class="row" style="margin-top:12px">${can('agents') ? `<button class="btn primary" data-a="agentEdit" data-id="${a.id}">Modifier la fiche</button>` : ''}${can('mouvements') ? `<button class="btn" data-a="mvtNew" data-id="${a.id}">Enregistrer un mouvement</button>` : ''}<button class="btn" data-a="rapportDe" data-id="${a.id}">Rapport de présence</button></div>`; }
  if (t === 'mvt') body = table(['Du', 'Au', 'Type', 'Service', 'Poste', 'Motif', 'Référence', 'Enregistré par'], mvtRows(a.id, true));
  if (t === 'abs') body = table(['Type', 'Du', 'Au', 'Jours', 'Statut', 'Motif'], Object.values(S.absences).filter(x => x.agentId === a.id).sort((x, y) => y.debut.localeCompare(x.debut)).map(x => `<tr><td>${esc(absType(x.type)[1])}</td><td>${fDT(x.debut)}</td><td>${fDT(x.fin)}</td><td>${x.jCal}</td><td>${absPill(x)}</td><td>${esc(x.motif || '')}</td></tr>`));
  if (t === 'pt') { const days = E.range(E.addDays(E.today(), -30), E.today()).reverse().map(d => ({ d, r: ev(a, d) })).filter(x => x.r.start || x.r.pointe), sy = E.synthese(days.map(x => x.r));
    body = `<div class="ind" style="margin-bottom:10px"><div><b>${sy.jPres}</b><span>Jours de présence (30 j)</span></div><div><b>${sy.nRetards}</b><span>Retards · ${E.fmtMin(sy.minRetard)}</span></div><div><b>${sy.jAbsNJ + sy.jPresume}</b><span>Absences non justifiées ou présumées</span></div><div><b>${sy.taux == null ? '—' : sy.taux + ' %'}</b><span>Taux de présence</span></div></div>` + table(['Date', 'Vacation', 'Arrivée', 'Départ', 'Statut'], days.map(({ d, r }) => { const rc = rec(a.id, d) || {}, v = planVac(a.id, d); return `<tr><td>${fD(d)}</td><td>${v ? esc(v.code) : '—'}</td><td>${fT(rc.arr)}</td><td>${fT(rc.dep)}</td><td>${pill(r)}</td></tr>`; })); }
  return `<div class="tabs">${tabs.map(x => `<button class="${t === x[0] ? 'on' : ''}" data-a="ficheTab" data-k="${x[0]}" data-id="${a.id}">${x[1]}</button>`).join('')}</div>${body}`;
}

const CRUD = {
  services: { titre: 'Services', un: 'service', sub: 'Organisation : établissement → pôle → service → unité.', fields: () => [{ k: 'code', label: 'Code du service', req: 1 }, { k: 'nom', label: 'Nom du service', req: 1 }, { k: 'type', label: 'Type', type: 'select', opt: ['soins', 'médico-technique', 'administratif', 'technique'] }, { k: 'pole', label: 'Pôle ou département' }, { k: 'unites', label: 'Unités (séparées par des virgules)' }, { k: 'responsable', label: 'Responsable du service' }, { k: 'major', label: 'Major ou surveillant' }, { k: 'effTheo', label: 'Effectif théorique', type: 'number', attr: 'min="0"' }, { k: 'effMin', label: 'Effectif minimum par vacation', type: 'number', attr: 'min="0"' }, { k: 'actif', label: 'Statut', type: 'select', opt: [['oui', 'Actif'], ['non', 'Inactif']] }],
    cols: [['code', 'Code'], ['nom', 'Nom'], ['type', 'Type'], ['pole', 'Pôle'], ['responsable', 'Responsable'], ['major', 'Major'], ['effTheo', 'Théorique'], ['effMin', 'Minimum']], sort: 'nom' },
  postes: { titre: 'Postes', un: 'poste', sub: 'Référentiel des postes de travail. Un même poste peut être occupé par plusieurs agents.', fields: () => [{ k: 'code', label: 'Code du poste', req: 1 }, { k: 'intitule', label: 'Intitulé', req: 1 }, { k: 'categorie', label: 'Catégorie professionnelle' }, { k: 'corps', label: 'Corps d\'appartenance' }, { k: 'serviceId', label: 'Service de rattachement', type: 'select', opt: svcOpt('Tous les services') }, { k: 'typeHoraire', label: 'Type d\'horaires', type: 'select', opt: ['Jour', 'Jour et nuit', 'Garde', 'Administratif'] }, { k: 'description', label: 'Description des fonctions', type: 'textarea', wide: 1 }, { k: 'actif', label: 'Statut', type: 'select', opt: [['oui', 'Actif'], ['non', 'Inactif']] }],
    cols: [['code', 'Code'], ['intitule', 'Intitulé'], ['categorie', 'Catégorie'], ['corps', 'Corps'], ['typeHoraire', 'Horaires']], sort: 'intitule' },
  vacations: { titre: 'Vacations', un: 'vacation', fields: () => [{ k: 'code', label: 'Code court', req: 1, attr: 'maxlength="4"' }, { k: 'nom', label: 'Nom', req: 1 }, { k: 'type', label: 'Type', type: 'select', opt: ['jour', 'nuit', 'garde', 'permanence', 'astreinte', 'repos', 'personnalisé'] }, { k: 'debut', label: 'Heure de début', type: 'time', def: '08:00' }, { k: 'fin', label: 'Heure de fin (le lendemain si antérieure ou égale au début)', type: 'time', def: '16:00' }, { k: 'pause', label: 'Pause non travaillée (minutes)', type: 'number', attr: 'min="0"', def: 0 }, { k: 'actif', label: 'Statut', type: 'select', opt: [['oui', 'Active'], ['non', 'Inactive']] }],
    cols: [['code', 'Code'], ['nom', 'Nom'], ['type', 'Type'], ['debut', 'Début'], ['fin', 'Fin'], ['pause', 'Pause (min)']], sort: 'code' }
};
function crudCard(col) {
  const c = CRUD[col], ed = can(col);
  const rows = Object.values(S[col]).sort((a, b) => String(a[c.sort]).localeCompare(String(b[c.sort]))).map(o => `<tr>${c.cols.map(k => `<td data-l="${k[1]}">${esc(col === 'vacations' && o.travail === false && (k[0] === 'debut' || k[0] === 'fin') ? '—' : (o[k[0]] == null ? '' : o[k[0]]))}</td>`).join('')}<td data-l="Statut"><span class="pill ${o.actif === 'non' ? '' : 'ok'}">${o.actif === 'non' ? 'Inactif' : 'Actif'}</span></td><td class="acts">${ed ? `<button class="btn sm" data-a="crudEdit" data-col="${col}" data-id="${o.id}">Modifier</button>` : ''}</td></tr>`);
  return `<div class="card"><div class="row" style="margin-bottom:8px"><h2 style="margin-right:auto">${c.titre}</h2>${ed ? `<button class="btn primary" data-a="crudEdit" data-col="${col}">Ajouter</button>` : ''}</div>${table(c.cols.map(k => k[1]).concat(['Statut', '']), rows, 'resp')}</div>`;
}
V.services = () => header('Services', CRUD.services.sub) + crudCard('services');
V.postes = () => header('Postes', CRUD.postes.sub) + crudCard('postes');

function mvtRows(aid, short) {
  const ids = scopeIds();
  return Object.values(S.mouvements).filter(m => aid ? m.agentId === aid : (!ids || ids.includes(m.nouveauService) || ids.includes(m.ancienService))).sort((a, b) => b.debut.localeCompare(a.debut)).map(m => { const a = S.agents[m.agentId];
    return `<tr>${short ? '' : `<td data-l="Agent"><b>${esc(nomA(a))}</b></td>`}<td data-l="Du">${fD(m.debut)}</td><td data-l="Au">${m.fin ? fD(m.fin) : '<span class="pill ok">En cours</span>'}</td><td data-l="Type">${esc(m.type)}</td><td data-l="Service">${m.ancienService && m.ancienService !== m.nouveauService ? esc(svcN(m.ancienService)) + ' → ' : ''}${esc(svcN(m.nouveauService))}</td><td data-l="Poste">${m.ancienPoste && m.ancienPoste !== m.nouveauPoste ? esc(posN(m.ancienPoste)) + ' → ' : ''}${esc(posN(m.nouveauPoste))}</td><td data-l="Motif">${esc(m.motif || '')}</td><td data-l="Référence">${esc(m.ref || '')}</td><td data-l="Enregistré par">${esc(who(m.par))}</td></tr>`; });
}
V.mouvements = () => header('Affectations et mouvements', 'Chaque mouvement clôt l\'affectation précédente et la conserve dans l\'historique.', can('mouvements') ? '<button class="btn primary" data-a="mvtNew">Nouveau mouvement</button>' : '') +
  `<div class="card">${table(['Agent', 'Du', 'Au', 'Type', 'Service', 'Poste', 'Motif', 'Référence', 'Enregistré par'], mvtRows(null), 'resp')}</div>`;

const absPill = x => `<span class="pill ${{ 'approuvée': 'ok', 'demandée': 'warn', 'rejetée': 'crit' }[x.statut] || ''}">${esc(x.statut)}</span>`;
V.absences = () => {
  const ids = scopeIds(), val = can('absValider');
  const list = Object.values(S.absences).filter(x => { const a = S.agents[x.agentId]; return a && (!ids || ids.includes(a.serviceId)) && (!UI.absF || x.statut === UI.absF); }).sort((a, b) => b.debut.localeCompare(a.debut));
  const rows = list.map(x => { const a = S.agents[x.agentId], b = [];
    if (val && x.statut === 'demandée') b.push(`<button class="btn sm green" data-a="absSet" data-id="${x.id}" data-k="approuvée">Approuver</button><button class="btn sm danger" data-a="absSet" data-id="${x.id}" data-k="rejetée">Rejeter</button>`);
    if (val && x.statut !== 'annulée') b.push(`<button class="btn sm" data-a="absReg" data-id="${x.id}">Régulariser</button>`);
    b.push(`<button class="btn sm" data-a="absHist" data-id="${x.id}">Historique</button>`);
    return `<tr><td data-l="Agent"><b>${esc(nomA(a))}</b><div class="small muted">${esc(svcN(a.serviceId))}</div></td><td data-l="Type">${esc(absType(x.type)[1])}</td><td data-l="Du">${fDT(x.debut)}</td><td data-l="Au">${fDT(x.fin)}</td><td data-l="Jours" class="num">${x.jCal} cal. · ${x.jOuv} ouvrés</td><td data-l="Heures impactées" class="num">${E.fmtH(x.hImpact || 0)}</td><td data-l="Statut">${absPill(x)}</td><td class="acts">${b.join('')}</td></tr>`; });
  return header('Absences et congés', 'Une absence régularisée garde tout son historique.', `<select data-c="absF" aria-label="Statut">${opts([['', 'Tous les statuts'], 'demandée', 'approuvée', 'rejetée', 'annulée'], UI.absF)}</select>` + (can('absDemande') ? '<button class="btn primary" data-a="absNew">Nouvelle demande</button>' : '')) +
    `<div class="card">${table(['Agent', 'Type', 'Du', 'Au', 'Durée', 'Heures programmées', 'Statut', 'Actions'], rows, 'resp')}</div>`;
};

function rapportAgent(a, from, to) { return E.range(from, to).map(d => ({ d, r: ev(a, d), rc: rec(a.id, d) || {}, v: planVac(a.id, d) })); }
function rapportRows() {
  const R = UI.rp;
  if (R.type === 'agent') { const a = S.agents[R.agent]; if (!a) return null; const days = rapportAgent(a, R.from, R.to);
    return { a, days, sy: E.synthese(days.map(x => x.r)), head: ['Date', 'Vacation', 'Arrivée prévue', 'Arrivée réelle', 'Départ prévu', 'Départ réel', 'Retard', 'Absence', 'Statut', 'Observation'],
      rows: days.map(({ d, r, rc, v }) => [fD(d), v ? v.code : '', r.start ? fT(r.start) : '', rc.arr ? fT(rc.arr) : '', r.end ? fT(r.end) : '', rc.dep ? fT(rc.dep) : '', r.retard ? E.fmtMin(r.retard) : '', (r.hAbsJ + r.hAbsNJ) ? E.fmtH(r.hAbsJ + r.hAbsNJ) + (r.hAbsNJ ? ' non just.' : ' just.') : '', (E.LABELS[r.code] || r.code) + (rc.valide ? ' (validé)' : ''), (rc.obs || '') + (rc.arrMode === 'manuel' ? ' [saisie manuelle]' : '') + (rc.corr && rc.corr.length ? ' [' + rc.corr.length + ' correction(s)]' : '')]) }; }
  const ids = R.svc ? [R.svc] : scopeIds();
  const list = agentsOf(ids, R.to).map(a => ({ a, sy: E.synthese(rapportAgent(a, R.from, R.to).map(x => x.r)) }));
  return { list, head: ['Matricule', 'Agent', 'Service', 'Jours programmés', 'Jours de présence', 'Abs. justifiées', 'Abs. non justifiées', 'Abs. présumées', 'Retards', 'Minutes de retard', 'Départs anticipés', 'Pointages incomplets', 'Heures programmées', 'Heures de présence', 'Heures validées', 'Heures sup. validées', 'Taux de présence (%)'],
    rows: list.map(({ a, sy }) => [a.matricule, nomA(a), svcN(a.serviceId), sy.jProg, sy.jPres, sy.jAbsJ, sy.jAbsNJ, sy.jPresume, sy.nRetards, sy.minRetard, sy.nAnticipes, sy.nIncomplets, +sy.hProg.toFixed(2), +sy.hPres.toFixed(2), +sy.hVal.toFixed(2), +sy.hSup.toFixed(2), sy.taux == null ? '' : sy.taux]) };
}
V.rapports = () => {
  const R = UI.rp, ids = scopeIds(); if (R.type === 'agent' && !S.agents[R.agent]) R.agent = (agentsOf(ids)[0] || {}).id || '';
  const need = [...new Set(E.range(R.from, R.to).map(mois))].filter(m => !loadedMonths.has(m));
  if (persist && need.length) { ensureMonths(need).then(render); return header('Rapports et statistiques') + '<div class="card">Chargement de la période…</div>'; }
  const D = rapportRows(); let body = '';
  const ctl = `<div class="card"><div class="row"><select data-c="rpType" aria-label="Type de rapport">${opts([['agent', 'Rapport individuel'], ['service', 'Rapport collectif']], R.type)}</select>${R.type === 'agent' ? `<select data-c="rpAgent" aria-label="Agent">${opts(agOpt(ids), R.agent)}</select>` : ((UI.role === 'chef' || UI.role === 'major') ? '' : `<select data-c="rpSvc" aria-label="Service">${opts(svcOpt('Tous les services'), R.svc)}</select>`)}<label class="small">Du <input type="date" data-c="rpFrom" value="${R.from}"></label><label class="small">au <input type="date" data-c="rpTo" value="${R.to}"></label><span style="flex:1"></span><button class="btn" data-a="xlsx">Exporter en Excel</button><button class="btn" data-a="pdf">Exporter en PDF</button>${R.type === 'agent' && can('valider') ? '<button class="btn green" data-a="validerPeriode">Valider les heures de la période</button>' : ''}</div></div>`;
  if (R.type === 'agent' && D) { const a = D.a, sy = D.sy, I = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;
    const corr = []; D.days.forEach(x => (x.rc.corr || []).forEach(c => corr.push(`<tr><td>${fD(x.d)}</td><td>${fDT(c.t)}</td><td>${esc(c.champ)}</td><td>${esc(c.avant || '—')}</td><td>${esc(c.apres || '—')}</td><td>${esc(c.motif)}</td><td>${esc(who(c.par))}</td></tr>`)));
    body = `<div class="card"><h2>${esc(nomA(a))} · matricule ${esc(a.matricule)}</h2><p class="small muted">${esc(a.corps || '—')} · ${esc(posN(a.posteId))} · ${esc(svcN(a.serviceId))} · période du ${fD(R.from)} au ${fD(R.to)}</p><div class="ind">${I(sy.jProg, 'Jours programmés')}${I(sy.jPres, 'Jours de présence')}${I(sy.jAbsJ, 'Jours d\'absence justifiée')}${I(sy.jAbsNJ, 'Jours d\'absence non justifiée')}${I(sy.jPresume, 'Absences présumées à vérifier')}${I(sy.nRetards, 'Retards · ' + E.fmtMin(sy.minRetard))}${I(E.fmtH(sy.hProg), 'Heures programmées')}${I(E.fmtH(sy.hPres), 'Heures de présence')}${I(E.fmtH(sy.hVal), 'Heures validées')}${I(E.fmtH(sy.hSup), 'Heures sup. validées')}${I(sy.nAnticipes, 'Départs anticipés')}${I(sy.nIncomplets, 'Pointages incomplets')}${I(sy.taux == null ? '—' : sy.taux + ' %', 'Taux de présence')}</div></div>
    <div class="card"><h2>Détail chronologique</h2>${table(D.head, D.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`))}</div><div class="card"><h2>Historique des corrections</h2>${table(['Journée', 'Corrigé le', 'Champ', 'Avant', 'Après', 'Motif', 'Par'], corr)}</div>`; }
  else if (D) body = `<div class="card"><h2>Synthèse par agent, du ${fD(R.from)} au ${fD(R.to)}</h2>${table(D.head, D.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`))}</div>`;
  return header('Rapports et statistiques') + `<div class="stack">${ctl}${body}</div>`;
};

V.alertes = () => {
  const al = alerts(), P = { 1: ['crit', 'Haute'], 2: ['warn', 'Moyenne'], 3: ['', 'Basse'] }, t = E.today(), now = new Date();
  const rows = al.map(a => `<tr><td data-l="Priorité"><span class="pill ${P[a.prio][0]}">${P[a.prio][1]}</span></td><td data-l="Type"><b>${esc(a.type)}</b></td><td data-l="Détail">${esc(a.texte)}</td><td data-l="Service">${esc(a.svc)}</td><td data-l="Date">${fD(a.date)}</td><td data-l="Destinataire">${esc(a.dest)}</td><td data-l="Traitement">${a.traite ? `<span class="pill ok">Traitée</span><div class="small muted">${esc(who(a.traite.par))}${a.traite.note ? ' · ' + esc(a.traite.note) : ''}</div>` : `<button class="btn sm" data-a="alTraiter" data-key="${esc(a.key)}" data-d="${a.date}">Marquer traitée</button>`}</td></tr>`);
  const lates = agentsOf(scopeIds()).map(a => { let n = 0, m = 0; for (let i = 0; i < 7; i++) { const r = ev(a, E.addDays(t, -i), now); if (r.retard) { n++; m += r.retard; } } return { a, n, m }; }).filter(x => x.n).sort((x, y) => y.m - x.m).slice(0, 8);
  return header('Alertes', 'Une alerte signale une situation à vérifier. Elle n\'entraîne jamais de sanction automatique.') +
    `<div class="stack"><div class="card"><h2>Centre de notifications · ${al.filter(a => !a.traite).length} à traiter</h2>${table(['Priorité', 'Type', 'Détail', 'Service', 'Date', 'Destinataire', 'Traitement'], rows, 'resp')}</div>
    <div class="card"><h2>Retards des 7 derniers jours</h2>${table(['Agent', 'Service', 'Nombre de retards', 'Cumul'], lates.map(x => `<tr><td><b>${esc(nomA(x.a))}</b></td><td>${esc(svcN(x.a.serviceId))}</td><td>${x.n}</td><td>${E.fmtMin(x.m)}</td></tr>`))}</div></div>`;
};

V.admin = () => {
  const tabs = [['droits', 'Profils et droits'], ['audit', 'Journal d\'audit'], ['sauvegarde', 'Sauvegarde et restauration']]; let body = '';
  if (UI.admTab === 'droits') body = `<p class="small muted">Chaque profil ne voit que les modules cochés. Le chef de service et le Major sont limités au service qui leur est attribué.</p>` + table(['Module'].concat(Object.values(ROLES)), MENU.map(m => `<tr><td><b>${m[1]}</b></td>${Object.keys(ROLES).map(r => `<td>${ACCESS[r].includes(m[0]) ? '<span class="pill ok">Oui</span>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`));
  if (UI.admTab === 'audit') { const evs = []; Object.values(S.audit).forEach(d => Object.values(d.ev || {}).forEach(e => evs.push(e))); evs.sort((a, b) => b.t.localeCompare(a.t));
    body = table(['Date et heure', 'Auteur', 'Opération', 'Détail'], evs.slice(0, 300).map(e => `<tr><td>${fDT(e.t)}</td><td>${esc(who(e.par))}</td><td><b>${esc(e.action)}</b></td><td>${esc(e.detail)}</td></tr>`)); }
  if (UI.admTab === 'sauvegarde') body = `<p>La sauvegarde contient les services, postes, agents, vacations, mouvements, absences, plannings et pointages chargés.</p><div class="row"><button class="btn primary" data-a="backup">Télécharger une sauvegarde</button><label class="btn">Restaurer depuis un fichier <input type="file" id="restoreFile" accept=".json,application/json" data-c="restore" style="display:none"></label></div><p class="small muted">La restauration ajoute ou remplace les fiches portant le même identifiant ; elle ne supprime rien.</p>`;
  return header('Administration') + `<div class="card"><div class="tabs">${tabs.map(x => `<button class="${UI.admTab === x[0] ? 'on' : ''}" data-a="admTab" data-k="${x[0]}">${x[1]}</button>`).join('')}</div>${body}</div>`;
};
const cfgFields = () => [{ k: 'etab', label: 'Nom de l\'établissement', req: 1, wide: 1 }, { k: 'tolerance', label: 'Tolérance de retard (minutes)', type: 'number', attr: 'min="0"' }, { k: 'delaiAbsence', label: 'Délai avant « absent présumé » (minutes)', type: 'number', attr: 'min="0"' }, { k: 'seuilDepart', label: 'Seuil de départ anticipé (minutes)', type: 'number', attr: 'min="0"' }, { k: 'delaiDepart', label: 'Délai avant « pointage incomplet » (minutes)', type: 'number', attr: 'min="0"' }, { k: 'seuilRetardAlerte', label: 'Retard déclenchant une alerte (minutes)', type: 'number', attr: 'min="0"' }, { k: 'pinObligatoire', label: 'Code PIN exigé à la borne', type: 'select', opt: [['oui', 'Oui'], ['non', 'Non, matricule seul']] }, { k: 'feries', label: 'Jours fériés (une date AAAA-MM-JJ par ligne)', type: 'textarea', wide: 1 }];
V.parametres = () => header('Paramètres', 'Règles appliquées par le moteur de calcul des présences.') + `<div class="stack"><div class="card"><h2>Règles de présence</h2>${can('config') ? formHtml('config', cfgFields(), S.config).replace('<button type="button" class="btn" data-a="closeModal">Annuler</button>', '') : '<p class="muted">Réservé au super administrateur.</p>'}</div>${crudCard('vacations')}</div>`;

V.moi = () => {
  if (!S.agents[UI.agent]) UI.agent = (agentsOf(null)[0] || {}).id || ''; const a = S.agents[UI.agent]; if (!a) return header('Mon espace') + '<div class="card muted">Aucun agent enregistré.</div>';
  const t = E.today(), r = ev(a, t), next = E.range(t, E.addDays(t, 6)), past = E.range(E.addDays(t, -14), t).reverse();
  return header('Mon espace', '', `<label class="small">Je suis <select data-c="agent" aria-label="Agent">${opts(agOpt(null), UI.agent)}</select></label>`) +
    `<div class="stack"><div class="card"><div class="row"><div style="margin-right:auto"><h2>${esc(nomA(a))}</h2><div class="small muted">${esc(posN(a.posteId))} · ${esc(svcN(a.serviceId))}</div></div>${pill(r)}<button class="btn primary" data-a="go" data-k="pointage">Pointer</button><button class="btn" data-a="absNew" data-id="${a.id}">Demander une absence</button></div></div>
    <div class="cols"><div class="card"><h2>Mon planning, 7 jours</h2>${table(['Jour', 'Vacation', 'Horaires'], next.map(d => { const v = planVac(a.id, d), x = ev(a, d); return `<tr><td>${JOURS[E.s2d(d).getDay()]} ${fD(d)}</td><td>${v ? esc(v.nom) : 'Non programmé'}</td><td>${x.start ? fT(x.start) + ' – ' + fT(x.end) : '—'}</td></tr>`; }))}</div>
    <div class="card"><h2>Mes demandes</h2>${table(['Type', 'Du', 'Au', 'Statut'], Object.values(S.absences).filter(x => x.agentId === a.id).sort((x, y) => y.debut.localeCompare(x.debut)).map(x => `<tr><td>${esc(absType(x.type)[1])}</td><td>${fDT(x.debut)}</td><td>${fDT(x.fin)}</td><td>${absPill(x)}</td></tr>`))}</div></div>
    <div class="card"><h2>Mes pointages, 14 jours</h2>${table(['Date', 'Vacation', 'Arrivée', 'Départ', 'Statut'], past.map(d => ({ d, x: ev(a, d) })).filter(o => o.x.start || o.x.pointe).map(({ d, x }) => { const rc = rec(a.id, d) || {}, v = planVac(a.id, d); return `<tr><td>${fD(d)}</td><td>${v ? esc(v.code) : '—'}</td><td>${fT(rc.arr)}</td><td>${fT(rc.dep)}</td><td>${pill(x)}</td></tr>`; }))}</div></div>`;
};

function renderNav() {
  const acc = ACCESS[UI.role], n = acc.includes('alertes') ? alerts().filter(a => !a.traite).length : 0;
  $('#nav').innerHTML = `<div class="brand"><div class="logo">${ico('clock').replace('currentColor', '#fff')}</div><div><b>POINTVIEW</b><small>Pointage et présences</small></div></div>
  <nav>${MENU.filter(m => acc.includes(m[0])).map(m => `<button class="${UI.view === m[0] ? 'on' : ''}" data-a="go" data-k="${m[0]}">${ico(m[2])}<span>${m[1]}</span>${m[0] === 'alertes' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</nav>
  <div class="who"><label for="roleSel">Profil utilisé</label><select id="roleSel" data-c="role">${opts(Object.entries(ROLES), UI.role)}</select>${(UI.role === 'chef' || UI.role === 'major') ? `<label for="svcSel">Service attribué</label><select id="svcSel" data-c="svc">${opts(svcOpt(), UI.svc)}</select>` : ''}<span>${demo ? 'Données d\'exemple' : (dbState === 'lecture' ? 'Lecture seule' : 'Données enregistrées')}</span></div>`;
}
function render() {
  if (!ACCESS[UI.role].includes(UI.view)) UI.view = ACCESS[UI.role][0];
  scopeIds(); renderNav();
  let html; try { html = V[UI.view](); } catch (e) { console.error(e); html = header('POINTVIEW') + `<div class="card errbox">Cette page n'a pas pu s'afficher (${esc(e.message)}). Changez de page puis revenez.</div>`; }
  $('#main').innerHTML = html; remember();
}

/* ---------- Actions ---------- */
const A = {
  closeModal, menu: () => $('#nav').classList.toggle('open'),
  go: d => { UI.view = d.k; $('#nav').classList.remove('open'); UI.k = { mat: '', aid: null, err: '', done: null }; render(); window.scrollTo(0, 0); },
  kpi: d => { const L = dayStats(UI.date, scopeIds()), T = { actifs: 'Agents actifs', attendus: 'Agents attendus', presents: 'Agents présents', retards: 'Agents en retard', absents: 'Agents absents', conges: 'Congés, permissions et absences justifiées' };
    if (d.k === 'sous') { const s = svcList().filter(x => !scopeIds() || scopeIds().includes(x.id)).map(x => ({ x, e: staffing(x, UI.date) })).filter(o => o.e.sous);
      return openModal('Services en sous-effectif', table(['Service', 'Présents', 'Minimum requis', 'Manquants', 'Major'], s.map(o => `<tr><td><b>${esc(o.x.nom)}</b></td><td>${o.e.pres}</td><td>${o.e.min}</td><td>${o.e.manquant}</td><td>${esc(o.x.major || '—')}</td></tr>`))); }
    listModal(`${L[d.k].length} ${T[d.k].toLowerCase()} · ${fD(UI.date)}`, L[d.k]); },
  svcList: d => listModal(svcN(d.id) + ' · ' + fD(UI.date), dayStats(UI.date, [d.id]).actifs.filter(x => x.r.start || x.r.pointe || ['conge', 'permission', 'absence_j'].includes(x.r.code))),
  ptTab: d => { UI.ptTab = d.k; render(); },
  pt: d => { const a = S.agents[d.id], now = new Date(); openModal((d.k === 'arr' ? 'Enregistrer l\'arrivée' : 'Enregistrer le départ') + ' · ' + nomA(a), formHtml('pt', [{ k: 'heure', label: 'Heure de présence déclarée', type: 'time', req: 1, def: fT(now) }, { k: 'obs', label: 'Observation', wide: 1 }], null, { id: d.id, d: d.d, kind: d.k }) + `<p class="small muted">L'heure de saisie et votre profil sont enregistrés à part de l'heure déclarée.</p>`, true); },
  ptAbs: d => openModal('Signaler l\'absence · ' + nomA(S.agents[d.id]), formHtml('ptAbs', [{ k: 'justifie', label: 'Nature', type: 'select', opt: [['non', 'Absence non justifiée'], ['oui', 'Absence justifiée']] }, { k: 'obs', label: 'Motif ou observation', req: 1, wide: 1 }], null, { id: d.id, d: d.d }), true),
  ptBulk: () => { const ids = [...document.querySelectorAll('.selPt:checked')].map(x => x.value); const list = ids.length ? ids : [...document.querySelectorAll('.selPt:not(:disabled)')].map(x => x.value);
    if (!list.length) return toast('Tous les agents affichés sont déjà pointés.');
    openModal('Pointer les agents présents', `<form data-form="ptBulk" class="form"><p>Décochez les agents qui ne sont pas présents.</p><div class="stack" style="gap:6px;margin-bottom:12px">${list.map(id => `<label><input type="checkbox" name="ag" value="${id}" checked> ${esc(nomA(S.agents[id]))} <span class="muted small">prévu à ${fT(ev(S.agents[id], UI.date).start)}</span></label>`).join('')}</div><div class="grid2">${field({ k: 'mode', label: 'Heure d\'arrivée à enregistrer', type: 'select', opt: [['saisie', 'L\'heure saisie ci-contre'], ['prevue', 'L\'heure prévue de chaque agent']] })}${field({ k: 'heure', label: 'Heure déclarée', type: 'time', def: fT(new Date()) })}</div><div class="actions"><button type="button" class="btn" data-a="closeModal">Annuler</button><button class="btn green">Confirmer le pointage</button></div></form>`, true); },
  ptDetail: d => { const a = S.agents[d.id], rc = rec(d.id, d.d) || {}, r = ev(a, d.d), L = [['Vacation prévue', r.start ? fDT(r.start) + ' → ' + fDT(r.end) : 'Aucune'], ['Arrivée déclarée', fDT(rc.arr)], ['Saisie de l\'arrivée', rc.arr ? fDT(rc.arrSaisi) + ' · ' + (rc.arrMode === 'manuel' ? 'saisie manuelle par ' + who(rc.arrPar) : 'borne, par l\'agent') : '—'], ['Départ déclaré', fDT(rc.dep)], ['Saisie du départ', rc.dep ? fDT(rc.depSaisi) + ' · ' + (rc.depMode === 'manuel' ? 'saisie manuelle par ' + who(rc.depPar) : 'borne, par l\'agent') : '—'], ['Heures de présence', E.fmtH(r.hPres)], ['Heures validées', rc.valide ? E.fmtH(r.hVal) + ' · ' + who(rc.valide.par) : 'Non validées'], ['Observation', rc.obs || '—']];
    if (rc.orig) L.push(['Enregistrement initial', 'arrivée ' + fDT(rc.orig.arr) + ' · départ ' + fDT(rc.orig.dep)]);
    openModal(nomA(a) + ' · ' + fD(d.d), `<p>${pill(r)}</p><div class="ind">${L.map(x => `<div><span>${x[0]}</span><b style="font-size:14px">${esc(x[1])}</b></div>`).join('')}</div><h3 style="margin:14px 0 6px">Corrections</h3>${table(['Le', 'Champ', 'Avant', 'Après', 'Motif', 'Par'], (rc.corr || []).map(c => `<tr><td>${fDT(c.t)}</td><td>${esc(c.champ)}</td><td>${esc(c.avant || '—')}</td><td>${esc(c.apres || '—')}</td><td>${esc(c.motif)}</td><td>${esc(who(c.par))}</td></tr>`))}<div class="row" style="margin-top:12px">${can('corriger') ? `<button class="btn primary" data-a="ptCorr" data-id="${d.id}" data-d="${d.d}">Corriger ou justifier</button>` : (UI.role === 'major' ? `<button class="btn" data-a="ptDemande" data-id="${d.id}" data-d="${d.d}">Demander une correction</button>` : '')}${can('valider') && rc.arr && rc.dep && !rc.valide ? `<button class="btn green" data-a="ptValider" data-id="${d.id}" data-d="${d.d}">Valider les heures</button>` : ''}</div>`); },
  ptCorr: d => openModal('Corriger ou justifier · ' + nomA(S.agents[d.id]), formHtml('ptCorr', [{ k: 'champ', label: 'Élément à corriger', type: 'select', opt: [['arr', 'Heure d\'arrivée'], ['dep', 'Heure de départ'], ['justifie', 'Justifier le retard, le départ ou l\'absence'], ['absent', 'Annuler le signalement d\'absence']] }, { k: 'heure', label: 'Nouvelle heure (pour arrivée ou départ)', type: 'time' }, { k: 'motif', label: 'Motif de la correction', req: 1, wide: 1 }], null, { id: d.id, d: d.d }) + '<p class="small muted">L\'enregistrement initial est conservé et la correction est tracée.</p>', true),
  ptDemande: d => openModal('Demander une correction', formHtml('ptDemande', [{ k: 'motif', label: 'Correction demandée et motif', type: 'textarea', req: 1, wide: 1 }], null, { id: d.id, d: d.d }, 'Envoyer au chef de service'), true),
  ptValider: async d => { await setRec(d.id, d.d, { valide: { t: new Date().toISOString(), par: par() } }); log('Validation des heures', nomA(S.agents[d.id]) + ' · ' + fD(d.d)); closeModal(); render(); toast('Heures validées.'); },
  kReset: () => { UI.k = { mat: '', aid: null, err: '', done: null }; render(); },
  kPoint: async d => { const K = UI.k, a = S.agents[K.aid]; if (!a) return; const date = kioskDate(a), rc = rec(a.id, date) || {}, r = ev(a, date);
    if (S.config.pinObligatoire !== 'non') { const pin = ($('#kPin') || {}).value || '';
      if (!a.pinHash) { K.err = 'Aucun code PIN n\'est défini pour vous. Adressez-vous à votre Major pour être pointé(e).'; return render(); }
      if (await hashPin(a.matricule, pin) !== a.pinHash) { K.err = 'Code PIN incorrect. Réessayez ou adressez-vous à votre Major.'; log('Code PIN incorrect à la borne', 'Matricule ' + a.matricule); return render(); } }
    if (d.k === 'arr' && rc.arr) { K.err = 'Votre arrivée est déjà enregistrée à ' + fT(rc.arr) + '.'; return render(); }
    if (d.k === 'dep' && (!rc.arr || rc.dep)) { K.err = rc.dep ? 'Votre départ est déjà enregistré à ' + fT(rc.dep) + '.' : 'Aucune arrivée enregistrée : adressez-vous à votre Major.'; return render(); }
    const t = new Date().toISOString(), p = d.k === 'arr' ? { arr: t, arrSaisi: t, arrMode: 'borne' } : { dep: t, depSaisi: t, depMode: 'borne' };
    await setRec(a.id, date, p); log(d.k === 'arr' ? 'Pointage d\'arrivée (borne)' : 'Pointage de départ (borne)', nomA(a) + ' · ' + fT(t));
    K.done = { kind: d.k, t, nom: nomA(a), note: !r.start ? 'Vous n\'étiez pas programmé(e) : votre responsable en est informé.' : '' }; K.err = ''; render(); },
  week: d => { UI.week = +d.k ? E.addDays(UI.week, +d.k) : E.today(); const w = [mois(E.addDays(UI.week, -7)), mois(E.addDays(UI.week, 7))]; ensureMonths(w).then(render); },
  rotation: () => openModal('Rotation automatique', formHtml('rotation', [{ k: 'motif', label: 'Cycle (codes de vacation séparés par des virgules)', req: 1, def: 'J,J,N,R,R', wide: 1 }, { k: 'debut', label: 'À partir du', type: 'date', req: 1, def: UI.week }, { k: 'jours', label: 'Nombre de jours à remplir', type: 'number', def: 28, attr: 'min="1" max="62"' }, { k: 'decalage', label: 'Décalage entre agents', type: 'select', opt: [['1', 'Un cran par agent'], ['0', 'Tous au même rythme']] }], null, null, 'Appliquer au service') + `<p class="small muted">Codes disponibles : ${vacOpt().map(v => esc(v.code)).join(', ')}. Les cases déjà remplies sont remplacées sur la période.</p>`, true),
  copyWeek: async () => { const d0 = E.s2d(UI.week); d0.setDate(d0.getDate() - ((d0.getDay() + 6) % 7)); const w0 = E.d2s(d0); await ensureMonths([mois(E.addDays(w0, -7))]);
    for (const a of agentsOf([UI.planSvc], w0)) { const bym = {}; for (let i = 0; i < 7; i++) { const d = E.addDays(w0, i), src = (S.planning[a.id + '_' + mois(E.addDays(d, -7))] || { jours: {} }).jours[jj(E.addDays(d, -7))] || ''; (bym[mois(d)] = bym[mois(d)] || {})[jj(d)] = src; }
      for (const m in bym) await patch('planning', a.id + '_' + m, { agentId: a.id, mois: m, jours: {} }, { jours: bym[m] }); }
    log('Planning : copie de la semaine précédente', svcN(UI.planSvc) + ' · semaine du ' + fD(w0)); render(); toast('Semaine copiée.'); },
  swap: () => openModal('Échange de vacation', formHtml('swap', [{ k: 'a1', label: 'Premier agent', type: 'select', opt: agOpt([UI.planSvc]), req: 1 }, { k: 'a2', label: 'Second agent', type: 'select', opt: agOpt([UI.planSvc]), req: 1 }, { k: 'date', label: 'Date de la vacation', type: 'date', req: 1, def: UI.week }, { k: 'motif', label: 'Motif', req: 1, wide: 1 }], null, null, 'Valider l\'échange'), true),
  agentNew: () => openModal('Nouvel agent', formHtml('agent', agentFields(null), { situation: 'en activité', datePrise: E.today() })),
  agentEdit: d => openModal('Modifier · ' + nomA(S.agents[d.id]), formHtml('agent', agentFields(S.agents[d.id]), S.agents[d.id], { id: d.id })),
  fiche: d => { UI.ficheTab = 'id'; openModal('Dossier de ' + nomA(S.agents[d.id]), ficheHtml(S.agents[d.id])); },
  ficheTab: d => { UI.ficheTab = d.k; openModal('Dossier de ' + nomA(S.agents[d.id]), ficheHtml(S.agents[d.id])); },
  rapportDe: d => { UI.rp.type = 'agent'; UI.rp.agent = d.id; closeModal(); UI.view = ACCESS[UI.role].includes('rapports') ? 'rapports' : UI.view; render(); },
  crudEdit: d => { const c = CRUD[d.col], o = d.id ? S[d.col][d.id] : { actif: 'oui' }; openModal((d.id ? 'Modifier' : 'Ajouter') + ' : ' + c.un, formHtml('crud', c.fields(), o, { col: d.col, id: d.id || '' })); },
  mvtNew: d => openModal('Enregistrer un mouvement', formHtml('mvt', [{ k: 'agentId', label: 'Agent', type: 'select', opt: agOpt(null), req: 1 }, { k: 'type', label: 'Type de mouvement', type: 'select', opt: ['Changement de service', 'Changement de poste', 'Mise à disposition temporaire'] }, { k: 'nouveauService', label: 'Nouveau service', type: 'select', opt: svcOpt(), req: 1 }, { k: 'nouveauPoste', label: 'Nouveau poste', type: 'select', opt: posOpt() }, { k: 'debut', label: 'Date de début', type: 'date', req: 1, def: E.today() }, { k: 'fin', label: 'Date de fin (mise à disposition temporaire)', type: 'date' }, { k: 'motif', label: 'Motif du mouvement', req: 1 }, { k: 'ref', label: 'Référence administrative' }], d.id ? { agentId: d.id, nouveauService: S.agents[d.id].serviceId, nouveauPoste: S.agents[d.id].posteId } : null)),
  absNew: d => { const ids = UI.role === 'agent' ? null : scopeIds(), t = E.today(); openModal('Nouvelle demande d\'absence', formHtml('abs', [{ k: 'agentId', label: 'Agent concerné', type: 'select', opt: UI.role === 'agent' ? [[UI.agent, nomA(S.agents[UI.agent])]] : agOpt(ids), req: 1 }, { k: 'type', label: 'Type d\'absence', type: 'select', opt: ABS.filter(x => UI.role !== 'agent' || x[0] !== 'non_autorisee').map(x => [x[0], x[1]]) }, { k: 'debut', label: 'Début', type: 'datetime-local', req: 1, def: t + 'T08:00' }, { k: 'fin', label: 'Fin', type: 'datetime-local', req: 1, def: t + 'T16:00' }, { k: 'motif', label: 'Motif', req: 1, wide: 1 }, { k: 'justificatif', label: 'Référence du justificatif' }, { k: 'remplacant', label: 'Remplaçant prévu', type: 'select', opt: agOpt(ids, 'Aucun pour l\'instant') }], d && d.id ? { agentId: d.id } : null)); },
  absSet: async d => { const x = clone(S.absences[d.id]); x.statut = d.k; x.hist = (x.hist || []).concat([{ t: new Date().toISOString(), par: par(), action: 'Statut : ' + d.k }]); await put('absences', x.id, x); log('Absence ' + d.k, nomA(S.agents[x.agentId]) + ' · ' + absType(x.type)[1]); render(); toast('Demande ' + d.k + '.'); },
  absReg: d => { const x = S.absences[d.id]; openModal('Régulariser l\'absence', formHtml('absReg', [{ k: 'type', label: 'Type d\'absence', type: 'select', opt: ABS.map(t => [t[0], t[1]]) }, { k: 'statut', label: 'Statut', type: 'select', opt: ['demandée', 'approuvée', 'rejetée', 'annulée'] }, { k: 'justificatif', label: 'Référence du justificatif' }, { k: 'note', label: 'Motif de la régularisation', req: 1, wide: 1 }], x, { id: d.id }), true); },
  absHist: d => { const x = S.absences[d.id]; openModal('Historique de la demande', `<p>${esc(nomA(S.agents[x.agentId]))} · ${esc(absType(x.type)[1])} · ${esc(x.motif || '')}${x.justificatif ? ' · justificatif ' + esc(x.justificatif) : ''}</p>` + table(['Date', 'Auteur', 'Opération'], (x.hist || []).map(h => `<tr><td>${fDT(h.t)}</td><td>${esc(who(h.par))}</td><td>${esc(h.action)}</td></tr>`)), true); },
  alTraiter: d => openModal('Marquer l\'alerte comme traitée', formHtml('alTraiter', [{ k: 'note', label: 'Suite donnée', type: 'textarea', req: 1, wide: 1 }], null, { key: d.key, d: d.d }), true),
  admTab: d => { UI.admTab = d.k; render(); },
  validerPeriode: async () => { const R = UI.rp, a = S.agents[R.agent], bym = {}; let n = 0;
    E.range(R.from, R.to).forEach(d => { const rc = rec(a.id, d); if (rc && rc.arr && rc.dep && !rc.valide) { (bym[mois(d)] = bym[mois(d)] || {})[jj(d)] = { valide: { t: new Date().toISOString(), par: par() } }; n++; } });
    for (const m in bym) await patch('pointages', a.id + '_' + m, { agentId: a.id, mois: m, jours: {} }, { jours: bym[m] });
    log('Validation des heures d\'une période', nomA(a) + ' · ' + fD(R.from) + ' au ' + fD(R.to) + ' · ' + n + ' journée(s)'); render(); toast(n ? n + ' journée(s) validée(s).' : 'Aucune journée complète à valider sur la période.'); },
  xlsx: () => { const D = rapportRows(); if (!D) return; if (!window.XLSX) return toast('L\'export Excel n\'a pas pu se charger. Vérifiez la connexion et rechargez la page.', true);
    const R = UI.rp, top = [[S.config.etab || 'POINTVIEW'], [R.type === 'agent' ? 'Rapport individuel de présence : ' + nomA(D.a) + ' (' + D.a.matricule + ')' : 'Rapport collectif de présence'], ['Période du ' + fD(R.from) + ' au ' + fD(R.to)], []];
    const ws = XLSX.utils.aoa_to_sheet(top.concat([D.head], D.rows)), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Rapport');
    saveFile('pointview-rapport-' + R.from + '_' + R.to + '.xlsx', XLSX.write(wb, { type: 'array', bookType: 'xlsx' })); },
  pdf: () => { const D = rapportRows(); if (!D) return; if (!window.jspdf) return toast('L\'export PDF n\'a pas pu se charger. Vérifiez la connexion et rechargez la page.', true);
    const R = UI.rp, doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }), n = D.head.length, w = 277 / n, mc = Math.floor(w / 1.25), cl = s => String(s == null ? '' : s).replace(/[—–]/g, '-').replace(/−/g, '-');
    let y = 14; doc.setFontSize(13); doc.text(cl(S.config.etab || 'POINTVIEW'), 10, y); y += 6; doc.setFontSize(10);
    doc.text(cl(R.type === 'agent' ? 'Rapport individuel de présence : ' + nomA(D.a) + ' (' + D.a.matricule + ') - ' + svcN(D.a.serviceId) : 'Rapport collectif de présence') + ' - du ' + fD(R.from) + ' au ' + fD(R.to), 10, y); y += 7;
    const line = (cells, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(6.5); const parts = cells.map(c => doc.splitTextToSize(cl(c), w - 1.5).slice(0, 3)), h = Math.max(...parts.map(p => p.length)) * 2.7 + 1.6; if (y + h > 200) { doc.addPage(); y = 12; } parts.forEach((p, i) => doc.text(p, 10 + i * w, y + 2.6)); y += h; doc.setDrawColor(210); doc.line(10, y, 287, y); };
    line(D.head, true); D.rows.forEach(r => line(r)); void mc;
    saveFile('pointview-rapport-' + R.from + '_' + R.to + '.pdf', doc.output('arraybuffer')); },
  backup: () => saveFile('pointview-sauvegarde-' + E.today() + '.json', JSON.stringify({ version: 1, date: new Date().toISOString(), data: S }, null, 1)),
  startEmpty: async () => { if (!db) return; persist = true; demo = false; const vac = clone(S.vacations); Object.keys(S).forEach(k => { S[k] = {}; });
    await put('config', 'main', Object.assign({}, CFG0)); S.config = S.config.main; for (const v of Object.values(vac)) await put('vacations', v.id, v);
    loadedMonths = new Set([mois(E.today())]); dbState = 'ok'; subscribe(); await log('Initialisation de POINTVIEW', 'Base vide'); UI.view = 'services'; render(); toast('POINTVIEW est prêt. Commencez par créer vos services.'); },
  startDemo: async () => { if (!db) return; toast('Enregistrement des exemples en cours…'); persist = true; demo = false; const cfg = S.config;
    await qwrite('config/main', () => db.doc('config/main').set(cfg));
    for (const c of COLS.concat(['planning', 'pointages'])) for (const [id, o] of Object.entries(S[c])) await qwrite(c + '/' + id, () => db.doc(c + '/' + id).set(o));
    dbState = 'ok'; subscribe(); await log('Initialisation de POINTVIEW', 'Données d\'exemple enregistrées'); render(); toast('Exemples enregistrés. Vos saisies sont maintenant conservées.'); }
};
async function saveFile(filename, data) {
  const dl = await cap('downloads'); if (!dl) return toast('Le téléchargement n\'est pas disponible dans cette vue.', true);
  try { await dl.save({ filename, data }); toast('Fichier enregistré.'); } catch (e) { if (e && e.code === 'declined') return; toast('Téléchargement impossible (' + ((e && e.code) || 'erreur') + ').', true); }
}
function declared(a, date, time, kind) {
  let d = new Date(date + 'T' + time + ':00'); const r = ev(a, date), rc = rec(a.id, date) || {};
  if (kind === 'dep') { const ref = rc.arr ? new Date(rc.arr) : r.start; if (ref && d <= ref) d = new Date(d.getTime() + 86400000); }
  else if (r.start && d < new Date(r.start.getTime() - 6 * 3600000)) d = new Date(d.getTime() + 86400000);
  return d.toISOString();
}
const inScope = a => { const ids = scopeIds(); return !ids || ids.includes(agentSvc(a, E.today())) || UI.role === 'superadmin' || UI.role === 'rh'; };

/* ---------- Formulaires ---------- */
const F = {
  kFind: o => { const m = o.mat.trim().toLowerCase(), a = Object.values(S.agents).find(x => String(x.matricule).trim().toLowerCase() === m && x.situation !== 'sorti des effectifs'); UI.k = { mat: o.mat, aid: a ? a.id : null, err: a ? '' : 'Matricule inconnu. Vérifiez la saisie ou adressez-vous à votre Major.', done: null }; render(); },
  pt: async o => { const a = S.agents[o.id]; if (!can('pointer') || !inScope(a)) return toast('Vous n\'êtes pas habilité à pointer cet agent.', true); const rc = rec(o.id, o.d) || {};
    if (o.kind === 'arr' && rc.arr) return toast('Arrivée déjà enregistrée à ' + fT(rc.arr) + '.', true); if (o.kind === 'dep' && (!rc.arr || rc.dep)) return toast('Départ impossible : arrivée absente ou départ déjà saisi.', true);
    const t = declared(a, o.d, o.heure, o.kind), now = new Date().toISOString(); if (new Date(t) > new Date(Date.now() + 5 * 60000)) return toast('L\'heure déclarée ne peut pas être dans le futur.', true);
    const p = o.kind === 'arr' ? { arr: t, arrSaisi: now, arrMode: 'manuel', arrPar: par() } : { dep: t, depSaisi: now, depMode: 'manuel', depPar: par() }; if (o.obs) p.obs = o.obs;
    await setRec(o.id, o.d, p); log(o.kind === 'arr' ? 'Pointage manuel d\'arrivée' : 'Pointage manuel de départ', nomA(a) + ' · déclaré ' + fDT(t)); closeModal(); render(); toast((o.kind === 'arr' ? 'Arrivée' : 'Départ') + ' de ' + nomA(a) + ' enregistré à ' + fT(t) + '.'); },
  ptAbs: async o => { const a = S.agents[o.id]; if (!can('pointer') || !inScope(a)) return toast('Vous n\'êtes pas habilité.', true); await setRec(o.id, o.d, { absent: true, justifie: o.justifie === 'oui', obs: o.obs, absPar: par(), absSaisi: new Date().toISOString() }); log('Absence signalée', nomA(a) + ' · ' + fD(o.d) + ' · ' + o.obs); closeModal(); render(); toast('Absence de ' + nomA(a) + ' signalée.'); },
  ptBulk: async (o, form) => { if (!can('pointer')) return toast('Vous n\'êtes pas habilité.', true); const ids = [...form.querySelectorAll('input[name=ag]:checked')].map(x => x.value), now = new Date().toISOString(); let n = 0;
    for (const id of ids) { const a = S.agents[id]; if (!a || !inScope(a) || (rec(id, UI.date) || {}).arr) continue; const r = ev(a, UI.date); const t = (o.mode === 'prevue' && r.start) ? r.start.toISOString() : declared(a, UI.date, o.heure || fT(new Date()), 'arr'); if (new Date(t) > new Date(Date.now() + 5 * 60000)) continue;
      await setRec(id, UI.date, { arr: t, arrSaisi: now, arrMode: 'manuel', arrPar: par(), groupe: true }); n++; }
    log('Pointage groupé', n + ' agent(s) · ' + svcN(UI.svc) + ' · ' + fD(UI.date)); closeModal(); render(); toast(n + ' arrivée(s) enregistrée(s).'); },
  ptCorr: async o => { if (!can('corriger')) return toast('Vous n\'êtes pas habilité à corriger.', true); const a = S.agents[o.id], rc = clone(rec(o.id, o.d) || {}), p = {}, c = { t: new Date().toISOString(), par: par(), motif: o.motif };
    if (o.champ === 'arr' || o.champ === 'dep') { if (!o.heure) return toast('Indiquez la nouvelle heure.', true); if (o.champ === 'dep' && !rc.arr) return toast('Corrigez d\'abord l\'arrivée.', true);
      const t = declared(a, o.d, o.heure, o.champ); c.champ = o.champ === 'arr' ? 'Heure d\'arrivée' : 'Heure de départ'; c.avant = fDT(rc[o.champ]); c.apres = fDT(t);
      if (!rc.orig) p.orig = { arr: rc.arr || null, dep: rc.dep || null }; p[o.champ] = t; p[o.champ + 'Saisi'] = c.t; p[o.champ + 'Mode'] = 'manuel'; p[o.champ + 'Par'] = par(); if (o.champ === 'arr') p.absent = false; }
    else if (o.champ === 'justifie') { c.champ = 'Justification'; c.avant = rc.justifie ? 'Justifié' : 'Non justifié'; c.apres = 'Justifié'; p.justifie = true; }
    else { c.champ = 'Signalement d\'absence'; c.avant = rc.absent ? 'Absent signalé' : '—'; c.apres = 'Annulé'; p.absent = false; }
    p.corr = (rc.corr || []).concat([c]); await setRec(o.id, o.d, p); log('Correction de pointage', nomA(a) + ' · ' + fD(o.d) + ' · ' + c.champ + ' · ' + o.motif); closeModal(); render(); toast('Correction enregistrée et tracée.'); },
  ptDemande: async o => { const a = S.agents[o.id], rc = rec(o.id, o.d) || {}; await setRec(o.id, o.d, { demandes: (rc.demandes || []).concat([{ t: new Date().toISOString(), par: par(), motif: o.motif }]) }); log('Demande de correction', nomA(a) + ' · ' + fD(o.d) + ' · ' + o.motif); closeModal(); toast('Demande transmise au chef de service.'); },
  rotation: async o => { if (!can('planning')) return; const codes = o.motif.split(',').map(s => s.trim().toUpperCase()).filter(Boolean), map = {}; vacOpt().forEach(v => { map[v.code.toUpperCase()] = v.id; });
    const bad = codes.filter(c => !map[c]); if (!codes.length || bad.length) return toast('Code de vacation inconnu : ' + (bad.join(', ') || 'cycle vide') + '.', true);
    const n = Math.min(62, Math.max(1, +o.jours || 28)), ags = agentsOf([UI.planSvc], o.debut);
    for (let i = 0; i < ags.length; i++) { const bym = {}; for (let k = 0; k < n; k++) { const d = E.addDays(o.debut, k); (bym[mois(d)] = bym[mois(d)] || {})[jj(d)] = map[codes[(k + (o.decalage === '1' ? i : 0)) % codes.length]]; }
      for (const m in bym) await patch('planning', ags[i].id + '_' + m, { agentId: ags[i].id, mois: m, jours: {} }, { jours: bym[m] }); }
    E.range(o.debut, E.addDays(o.debut, n - 1)).forEach(d => loadedMonths.add(mois(d))); log('Planning : rotation automatique', svcN(UI.planSvc) + ' · ' + codes.join(',') + ' · ' + n + ' jours dès le ' + fD(o.debut)); closeModal(); render(); toast('Rotation appliquée à ' + ags.length + ' agent(s).'); },
  swap: async o => { if (!can('planning')) return; if (o.a1 === o.a2) return toast('Choisissez deux agents différents.', true); await ensureMonths([mois(o.date)]); const g = id => (S.planning[id + '_' + mois(o.date)] || { jours: {} }).jours[jj(o.date)] || '', v1 = g(o.a1), v2 = g(o.a2);
    await setPlan(o.a1, o.date, v2); await setPlan(o.a2, o.date, v1); log('Échange de vacation validé', nomA(S.agents[o.a1]) + ' ⇄ ' + nomA(S.agents[o.a2]) + ' · ' + fD(o.date) + ' · ' + o.motif); closeModal(); render(); toast('Échange enregistré.'); },
  agent: async o => { if (!can('agents')) return; const ex = o.id && S.agents[o.id], dup = Object.values(S.agents).find(x => x.matricule.trim().toLowerCase() === o.matricule.trim().toLowerCase() && x.id !== o.id); if (dup) return toast('Ce matricule est déjà attribué à ' + nomA(dup) + '.', true);
    if (o.pin && !/^\d{4,6}$/.test(o.pin)) return toast('Le code PIN doit comporter 4 à 6 chiffres.', true);
    const a = Object.assign({}, ex || { id: uid(), datePoste: o.datePrise || E.today() }, o); a.matricule = o.matricule.trim(); delete a.pin;
    if (o.pin) a.pinHash = await hashPin(a.matricule, o.pin); else if (ex && ex.matricule !== a.matricule) delete a.pinHash;
    await put('agents', a.id, a);
    if (!ex) { const m = { id: uid(), agentId: a.id, type: 'Prise de service', ancienService: '', nouveauService: a.serviceId, ancienPoste: '', nouveauPoste: a.posteId || '', debut: a.datePrise || E.today(), fin: '', motif: 'Affectation initiale', ref: '', par: par() }; await put('mouvements', m.id, m); }
    log(ex ? 'Fiche agent modifiée' : 'Agent créé', nomA(a) + ' · ' + a.matricule + (ex && ex.matricule !== a.matricule ? ' · matricule changé, code PIN à redéfinir' : '')); closeModal(); render(); toast('Fiche de ' + nomA(a) + ' enregistrée.'); },
  crud: async o => { if (!can(o.col)) return; const col = o.col, ex = o.id && S[col][o.id], x = Object.assign({}, ex || { id: uid() }, o); delete x.col; x.id = ex ? ex.id : x.id;
    ['effTheo', 'effMin', 'pause'].forEach(k => { if (k in x) x[k] = +x[k] || 0; });
    if (col === 'vacations') { x.travail = !['repos', 'astreinte'].includes(x.type); x.code = x.code.trim().toUpperCase(); }
    const dup = Object.values(S[col]).find(y => y.id !== x.id && String(y.code).toUpperCase() === String(x.code).toUpperCase()); if (dup) return toast('Ce code est déjà utilisé.', true);
    await put(col, x.id, x); log((ex ? 'Modification' : 'Création') + ' : ' + CRUD[col].un, x.code + ' · ' + (x.nom || x.intitule)); closeModal(); render(); toast('Enregistré.'); },
  mvt: async o => { if (!can('mouvements')) return; const a = clone(S.agents[o.agentId]), temp = o.type === 'Mise à disposition temporaire'; if (temp && !o.fin) return toast('Indiquez la date de fin de la mise à disposition.', true); if (o.fin && o.fin < o.debut) return toast('La date de fin précède la date de début.', true);
    const m = { id: uid(), agentId: a.id, type: o.type, ancienService: a.serviceId, nouveauService: o.nouveauService, ancienPoste: a.posteId || '', nouveauPoste: o.nouveauPoste || a.posteId || '', debut: o.debut, fin: temp ? o.fin : '', motif: o.motif, ref: o.ref, par: par() };
    if (temp) a.temp = { serviceId: o.nouveauService, debut: o.debut, fin: o.fin };
    else { for (const p of Object.values(S.mouvements)) if (p.agentId === a.id && !p.fin) await put('mouvements', p.id, Object.assign({}, p, { fin: o.debut })); a.serviceId = o.nouveauService; a.posteId = m.nouveauPoste; a.datePoste = o.debut; }
    await put('mouvements', m.id, m); await put('agents', a.id, a); log('Mouvement enregistré', nomA(a) + ' · ' + o.type + ' · ' + svcN(m.ancienService) + ' → ' + svcN(m.nouveauService)); closeModal(); render(); toast('Mouvement enregistré, historique conservé.'); },
  abs: async o => { if (!can('absDemande')) return; if (o.fin < o.debut) return toast('La fin précède le début.', true); const a = S.agents[o.agentId], d1 = o.debut.slice(0, 10), d2 = o.fin.slice(0, 10); await ensureMonths([...new Set(E.range(d1, d2).map(mois))]);
    let h = 0; E.range(d1, d2).forEach(d => { const v = planVac(a.id, d); if (v && v.travail !== false) h += Math.max(0, E.shiftWindow(d, v).dur - (v.pause || 0)) / 60; });
    const x = { id: uid(), agentId: a.id, serviceId: a.serviceId, type: o.type, debut: o.debut, fin: o.fin, motif: o.motif, justificatif: o.justificatif, remplacant: o.remplacant, statut: 'demandée', jCal: E.joursCal(d1, d2), jOuv: E.joursOuvres(d1, d2, String(S.config.feries || '').split(/\s+/)), hImpact: h, par: par(), hist: [{ t: new Date().toISOString(), par: par(), action: 'Demande enregistrée' }] };
    await put('absences', x.id, x); log('Demande d\'absence', nomA(a) + ' · ' + absType(o.type)[1] + ' · ' + fD(d1) + ' au ' + fD(d2)); closeModal(); render(); toast('Demande enregistrée, en attente de validation.'); },
  absReg: async o => { if (!can('absValider')) return; const x = clone(S.absences[o.id]), ch = []; ['type', 'statut', 'justificatif'].forEach(k => { if ((x[k] || '') !== (o[k] || '')) { ch.push(k + ' : ' + (x[k] || '—') + ' → ' + (o[k] || '—')); x[k] = o[k]; } });
    x.hist = (x.hist || []).concat([{ t: new Date().toISOString(), par: par(), action: 'Régularisation (' + (ch.join(' ; ') || 'sans changement') + ') · ' + o.note }]); await put('absences', x.id, x); log('Absence régularisée', nomA(S.agents[x.agentId]) + ' · ' + o.note); closeModal(); render(); toast('Régularisation enregistrée.'); },
  alTraiter: async o => { await patch('traitements', o.d, { date: o.d, items: {} }, { items: { [o.key]: { t: new Date().toISOString(), par: par(), note: o.note } } }); log('Alerte traitée', o.key + ' · ' + o.note); closeModal(); render(); toast('Alerte marquée comme traitée.'); },
  config: async o => { if (!can('config')) return; const c = Object.assign({}, S.config, o); ['tolerance', 'delaiAbsence', 'seuilDepart', 'delaiDepart', 'seuilRetardAlerte'].forEach(k => { c[k] = Math.max(0, +c[k] || 0); }); S.config = c; if (persist) await qwrite('config/main', () => db.doc('config/main').set(c)); log('Paramètres modifiés', 'Tolérance ' + c.tolerance + ' min'); render(); toast('Paramètres enregistrés.'); }
};
const C = {
  role: el => { UI.role = el.value; UI.fSvc = ''; UI.fPole = ''; render(); }, svc: el => { UI.svc = el.value; render(); }, agent: el => { UI.agent = el.value; render(); },
  date: el => { if (!el.value) return; UI.date = el.value; ensureMonths([mois(UI.date), mois(E.addDays(UI.date, -14))]).then(render); },
  fSvc: el => { UI.fSvc = el.value; render(); }, fPole: el => { UI.fPole = el.value; UI.fSvc = ''; render(); }, ptAll: el => { UI.ptAll = el.checked; render(); },
  planSvc: el => { UI.planSvc = el.value; render(); }, absF: el => { UI.absF = el.value; render(); },
  plan: async el => { if (!can('planning')) return; await setPlan(el.dataset.id, el.dataset.d, el.value); log('Planning modifié', nomA(S.agents[el.dataset.id]) + ' · ' + fD(el.dataset.d) + ' · ' + ((S.vacations[el.value] || {}).code || 'vide')); render(); },
  rpType: el => { UI.rp.type = el.value; render(); }, rpAgent: el => { UI.rp.agent = el.value; render(); }, rpSvc: el => { UI.rp.svc = el.value; render(); },
  rpFrom: el => { if (el.value && el.value <= UI.rp.to) { UI.rp.from = el.value; render(); } else toast('La date de début doit précéder la date de fin.', true); }, rpTo: el => { if (el.value && el.value >= UI.rp.from) { UI.rp.to = el.value; render(); } else toast('La date de fin doit suivre la date de début.', true); },
  restore: async el => { const f = el.files[0]; if (!f || UI.role !== 'superadmin') return; try { const j = JSON.parse(await f.text()), D = j.data || {}; let n = 0;
      for (const c of COLS.concat(['planning', 'pointages'])) for (const [id, o] of Object.entries(D[c] || {})) { if (o && typeof o === 'object' && /^[\w.~:@+-]+$/.test(id)) { await put(c, id, o); n++; } }
      log('Restauration depuis une sauvegarde', n + ' fiche(s)'); render(); toast(n + ' fiche(s) restaurée(s).'); } catch (e) { toast('Ce fichier n\'est pas une sauvegarde POINTVIEW lisible.', true); } }
};
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (el && A[el.dataset.a]) { if (el.tagName === 'BUTTON' && el.type === 'submit') return; e.preventDefault(); A[el.dataset.a](el.dataset, el); } else if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if (e.key === 'Enter' && e.target.matches && e.target.matches('tr.click')) e.target.click(); });
document.addEventListener('change', e => { const el = e.target.closest('[data-c]'); if (el && C[el.dataset.c]) C[el.dataset.c](el); });
document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.i === 'q') { UI.q = e.target.value; const l = $('#agList'); if (l) l.innerHTML = table(['Matricule', 'Nom et prénom', 'Poste', 'Service', 'Corps', 'Situation'], agentsRows(), 'resp'); } });
let busy = false;
document.addEventListener('submit', async e => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); if (busy) return; const o = {}; new FormData(f).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  busy = true; try { await F[f.dataset.form](o, f); } catch (err) { console.error(err); toast('L\'opération a échoué : ' + err.message, true); } finally { busy = false; } });

/* ---------- Données d'exemple ---------- */
async function buildDemo() {
  const t = E.today(), now = new Date(); let seed = 20261116; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  S.config = Object.assign({}, CFG0, { etab: 'Centre hospitalier (exemple)' });
  const V0 = [['J', 'Travail de jour', 'jour', '08:00', '16:00', 30], ['N', 'Travail de nuit', 'nuit', '16:00', '08:00', 60], ['G', 'Garde de 24 heures', 'garde', '08:00', '08:00', 120], ['P', 'Permanence', 'permanence', '08:00', '14:00', 0], ['R', 'Repos', 'repos', '00:00', '00:00', 0], ['A', 'Astreinte', 'astreinte', '00:00', '00:00', 0]];
  V0.forEach(v => { S.vacations['v' + v[0]] = { id: 'v' + v[0], code: v[0], nom: v[1], type: v[2], debut: v[3], fin: v[4], pause: v[5], travail: !['repos', 'astreinte'].includes(v[2]), actif: 'oui' }; });
  const SV = [['SAU', 'Urgences', 'soins', 'Pôle urgences et soins critiques', 'Dr I. Fall', 'A. Ndiaye', 7, 2, 'JJNRR'], ['MED', 'Médecine interne', 'soins', 'Pôle médecine', 'Dr M. Sow', 'F. Sarr', 5, 1, 'JJNRR'], ['MAT', 'Maternité', 'soins', 'Pôle mère-enfant', 'Dr A. Ba', 'K. Diouf', 5, 1, 'JNRR'], ['IMG', 'Imagerie médicale', 'médico-technique', 'Pôle médico-technique', 'Dr C. Gueye', 'M. Cissé', 3, 1, 'S'], ['LAB', 'Laboratoire', 'médico-technique', 'Pôle médico-technique', 'Dr N. Thiam', 'A. Mbaye', 3, 1, 'S'], ['ADM', 'Administration', 'administratif', 'Direction', 'C. Seck', '', 2, 0, 'S']];
  SV.forEach(s => { S.services['s' + s[0]] = { id: 's' + s[0], code: s[0], nom: s[1], type: s[2], pole: s[3], responsable: s[4], major: s[5], effTheo: s[6], effMin: s[7], actif: 'oui', unites: '' }; });
  const PO = [['MEDC', 'Médecin', 'A', 'Médecins'], ['INF', 'Infirmier', 'B', 'Infirmiers d\'État'], ['SF', 'Sage-femme', 'B', 'Sages-femmes d\'État'], ['AS', 'Aide-soignant', 'C', 'Assistants infirmiers'], ['TLAB', 'Technicien de laboratoire', 'B', 'Techniciens supérieurs'], ['MRAD', 'Manipulateur en radiologie', 'B', 'Techniciens supérieurs'], ['MAJ', 'Major', 'B', 'Infirmiers d\'État'], ['SEC', 'Secrétaire médical', 'C', 'Agents administratifs'], ['BRAN', 'Brancardier', 'D', 'Agents de service']];
  PO.forEach(p => { S.postes['p' + p[0]] = { id: 'p' + p[0], code: p[0], intitule: p[1], categorie: p[2], corps: p[3], serviceId: '', typeHoraire: 'Jour et nuit', description: '', actif: 'oui' }; });
  const AG = [['Awa', 'Ndiaye', 'F', 'SAU', 'MAJ'], ['Mamadou', 'Diop', 'M', 'SAU', 'INF'], ['Ibrahima', 'Fall', 'M', 'SAU', 'MEDC'], ['Ndèye', 'Thiam', 'F', 'SAU', 'INF'], ['Ousmane', 'Faye', 'M', 'SAU', 'AS'], ['Coumba', 'Seck', 'F', 'SAU', 'INF'], ['Pape', 'Diagne', 'M', 'SAU', 'BRAN'],
    ['Fatou', 'Sarr', 'F', 'MED', 'MAJ'], ['Mariama', 'Sow', 'F', 'MED', 'MEDC'], ['Cheikh', 'Gueye', 'M', 'MED', 'INF'], ['Astou', 'Kane', 'F', 'MED', 'AS'], ['Modou', 'Sy', 'M', 'MED', 'INF'],
    ['Khady', 'Diouf', 'F', 'MAT', 'MAJ'], ['Aminata', 'Ba', 'F', 'MAT', 'SF'], ['Rokhaya', 'Wade', 'F', 'MAT', 'SF'], ['Sokhna', 'Dieng', 'F', 'MAT', 'AS'], ['Dieynaba', 'Camara', 'F', 'MAT', 'SF'],
    ['Moussa', 'Cissé', 'M', 'IMG', 'MRAD'], ['Alioune', 'Ndour', 'M', 'IMG', 'MRAD'], ['Babacar', 'Niang', 'M', 'IMG', 'SEC'],
    ['Abdou', 'Mbaye', 'M', 'LAB', 'TLAB'], ['Serigne', 'Lo', 'M', 'LAB', 'TLAB'], ['Adama', 'Touré', 'F', 'LAB', 'TLAB'], ['Yacine', 'Badji', 'F', 'ADM', 'SEC'], ['Lamine', 'Mané', 'M', 'ADM', 'SEC']];
  const from = E.addDays(t, -24), to = E.addDays(t, 10), idx = {};
  for (let i = 0; i < AG.length; i++) {
    const g = AG[i], id = 'a' + (1001 + i), mat = String(1001 + i), po = S.postes['p' + g[4]];
    S.agents[id] = { id, matricule: mat, prenom: g[0], nom: g[1], sexe: g[2], naissance: (1975 + (i * 7) % 22) + '-0' + (1 + i % 9) + '-1' + (i % 9), tel: '', email: '', adresse: '', corps: po.corps, categorie: po.categorie, grade: '', statutAdm: i % 4 ? 'Fonctionnaire' : 'Contractuel', dateCorps: (2005 + i % 15) + '-01-15', datePrise: (2012 + i % 12) + '-03-01', serviceId: 's' + g[3], posteId: po.id, datePoste: (2012 + i % 12) + '-03-01', responsable: S.services['s' + g[3]].responsable, situation: 'en activité', pinHash: await hashPin(mat, '1234') };
    S.mouvements['m' + id] = { id: 'm' + id, agentId: id, type: 'Prise de service', ancienService: '', nouveauService: 's' + g[3], ancienPoste: '', nouveauPoste: po.id, debut: S.agents[id].datePrise, fin: '', motif: 'Affectation initiale', ref: '', par: { role: 'rh' } };
    const k = idx[g[3]] = (idx[g[3]] || 0) + 1, pat = SV.find(s => s[0] === g[3])[8];
    E.range(from, to).forEach((d, n) => { const wd = E.s2d(d).getDay(); let code;
      if (pat === 'S') code = (wd === 0 || wd === 6) ? ((g[3] !== 'ADM' && (Math.floor(n / 7) + k) % 3 === 0) ? 'G' : 'R') : 'J'; else code = pat[(n + k * 2) % pat.length];
      const pid = id + '_' + mois(d); (S.planning[pid] = S.planning[pid] || { agentId: id, mois: mois(d), jours: {} }).jours[jj(d)] = 'v' + code; });
  }
  const abs = (aid, type, d1, d2, statut, motif) => { const x = { id: 'x' + aid + d1, agentId: aid, serviceId: S.agents[aid].serviceId, type, debut: d1 + 'T08:00', fin: d2 + 'T16:00', motif, justificatif: '', remplacant: '', statut, jCal: E.joursCal(d1, d2), jOuv: E.joursOuvres(d1, d2, []), hImpact: 0, par: { role: 'rh' }, hist: [{ t: new Date(d1 + 'T07:00').toISOString(), par: { role: 'rh' }, action: 'Demande enregistrée' }] }; S.absences[x.id] = x; };
  abs('a1010', 'conge', E.addDays(t, -1), E.addDays(t, 5), 'approuvée', 'Congé annuel'); abs('a1015', 'maladie', E.addDays(t, -9), E.addDays(t, -7), 'approuvée', 'Certificat médical'); abs('a1004', 'permission', E.addDays(t, 1), E.addDays(t, 1), 'demandée', 'Cérémonie familiale');
  Object.values(S.agents).forEach(a => E.range(from, t).forEach(d => { const v = planVac(a.id, d); if (!v || v.travail === false || absOf(a.id, d)) return; const w = E.shiftWindow(d, v), x = rnd(); if (w.start > now) return;
    if (x < 0.045) return; const late = x < 0.14 ? 14 + Math.floor(rnd() * 40) : Math.floor(rnd() * 16) - 9, arr = new Date(w.start.getTime() + late * 60000); if (arr > now) return;
    const r = { arr: arr.toISOString(), arrSaisi: arr.toISOString(), arrMode: 'borne' }; const dep = new Date(w.end.getTime() + (x > 0.95 ? -(25 + Math.floor(rnd() * 60)) : Math.floor(rnd() * 14)) * 60000);
    if (dep <= now && !(x > 0.9 && x < 0.915)) { r.dep = dep.toISOString(); r.depSaisi = r.dep; r.depMode = 'borne'; if (d < E.addDays(t, -3)) r.valide = { t: dep.toISOString(), par: { role: 'chef' } }; }
    const pid = a.id + '_' + mois(d); (S.pointages[pid] = S.pointages[pid] || { agentId: a.id, mois: mois(d), jours: {} }).jours[jj(d)] = r; }));
}

/* ---------- Chargement ---------- */
async function ensureMonths(ms) {
  if (!persist) return; for (const m of [...new Set(ms)]) { if (loadedMonths.has(m)) continue; loadedMonths.add(m);
    try { for (const c of ['planning', 'pointages']) { const q = await db.collection(c).where('mois', '==', m).limit(1000).get(); q.docs.forEach(d => { S[c][d.id] = clone(d.data()); }); } } catch (e) { loadedMonths.delete(m); } }
}
function subscribe() {
  if (unsub || !db) return; const m = mois(E.today());
  try { unsub = db.collection('pointages').where('mois', '==', m).limit(1000).onSnapshot(snap => { let ch = false; snap.docChanges().forEach(c => { if (c.type !== 'removed') { S.pointages[c.doc.id] = clone(c.doc.data()); ch = true; } });
    const ae = document.activeElement, typing = ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName);
    if (ch && !demo && !$('#modal').classList.contains('open') && !typing && ['dashboard', 'alertes', 'pointage'].includes(UI.view) && !(UI.view === 'pointage' && UI.ptTab === 'borne')) render(); }, () => { unsub = null; }); } catch (e) { unsub = null; }
}
async function resolveNames() { if (!userCap || !userCap.profiles) return; const ids = new Set(); const scan = o => { if (o && typeof o === 'object') { if (o.par && o.par.id) ids.add(o.par.id); Object.values(o).forEach(scan); } }; scan(S.audit); scan(S.absences); scan(S.mouvements);
  const need = [...ids].filter(i => !(i in NAMES)).slice(0, 100); if (!need.length) return; try { const ps = await userCap.profiles(need); need.forEach(i => { NAMES[i] = (ps && ps[i] && ps[i].name) || ''; }); if (!$('#modal').classList.contains('open')) render(); } catch (e) {} }
async function connect() {
  db = await cap('db'); userCap = await cap('user');
  if (userCap) { try { me.id = await userCap.id(); } catch (e) {} }
  if (!db) { dbState = 'absente'; return render(); }
  try {
    const cfg = await db.doc('config/main').get();
    if (!cfg.exists) { let w = null; try { w = userCap && userCap.can ? await userCap.can('data.write') : null; } catch (e) {} dbState = w === false ? 'absente' : 'vide'; return render(); }
    const fresh = { services: {}, postes: {}, agents: {}, vacations: {}, mouvements: {}, absences: {}, planning: {}, pointages: {}, audit: {}, traitements: {}, config: Object.assign({}, CFG0, clone(cfg.data())) };
    for (const c of COLS) { const q = await db.collection(c).limit(1000).get(); q.docs.forEach(d => { fresh[c][d.id] = clone(d.data()); }); }
    for (const c of ['audit', 'traitements']) { const q = await db.collection(c).orderBy('date', 'desc').limit(15).get(); q.docs.forEach(d => { fresh[c][d.id] = clone(d.data()); }); }
    Object.keys(fresh).forEach(k => { S[k] = fresh[k]; }); demo = false; persist = true; loadedMonths = new Set(); const t = E.today();
    await ensureMonths([mois(t), mois(E.addDays(t, -24)), mois(E.addDays(t, 8))]);
    let w = null; try { w = userCap && userCap.can ? await userCap.can('data.write') : null; } catch (e) {} dbState = w === false ? 'lecture' : 'ok'; if (w === false) persist = false;
    subscribe(); render(); resolveNames();
  } catch (e) { console.error(e); dbState = 'absente'; render(); }
}
buildDemo().then(() => { render(); connect(); });
setInterval(() => { const ae = document.activeElement; if (!$('#modal').classList.contains('open') && !(ae && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) && ['dashboard', 'alertes'].includes(UI.view)) render(); }, 60000);
window.__pv = { S, UI, render, A, F };
})();
