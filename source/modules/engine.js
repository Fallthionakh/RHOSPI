/* POINTVIEW — moteur de calcul des présences (fonctions pures, sans interface) */
(function (g) {
  const pad = n => String(n).padStart(2, '0');
  const d2s = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const s2d = s => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (s, n) => { const d = s2d(s); d.setDate(d.getDate() + n); return d2s(d); };
  const hm2min = t => { const p = String(t || '00:00').split(':').map(Number); return p[0] * 60 + (p[1] || 0); };
  const today = () => d2s(new Date());
  const range = (a, b) => { const out = []; let d = a, i = 0; while (d <= b && i++ < 800) { out.push(d); d = addDays(d, 1); } return out; };

  /* Fenêtre réelle d'une vacation : gère le passage de minuit (16h–08h, 08h–08h). */
  function shiftWindow(date, vac) {
    const start = s2d(date); const a = hm2min(vac.debut), b = hm2min(vac.fin);
    start.setHours(0, a, 0, 0);
    const dur = b > a ? b - a : b + 1440 - a;
    return { start, end: new Date(start.getTime() + dur * 60000), dur };
  }

  const LABELS = {
    present: 'Présent à l\'heure', retard: 'Présent en retard', depart_anticipe: 'Départ anticipé',
    incomplet: 'Pointage incomplet', absent_presume: 'Absent présumé', absence_j: 'Absence justifiée',
    absence_nj: 'Absence non justifiée', conge: 'En congé', permission: 'En permission', repos: 'En repos',
    astreinte: 'D\'astreinte', non_programme: 'Non programmé', a_venir: 'À venir', attendu: 'Attendu',
    hors_planning: 'Présent hors planning'
  };

  /* Statut et heures d'un agent pour une date.
     o = {date, vac, rec, abs, now, cfg}
     vac : vacation planifiée (ou null) ; rec : pointage ; abs : absence couvrant la date {cat}. */
  function evalJour(o) {
    const cfg = o.cfg || {}, rec = o.rec || {}, vac = o.vac, now = o.now || new Date();
    const r = { code: '', retard: 0, anticipe: 0, hProg: 0, hPres: 0, hVal: 0, hSup: 0, hAbsJ: 0, hAbsNJ: 0, hPresume: 0,
      start: null, end: null, attendu: false, garde: false, pointe: false };
    const travail = !!vac && vac.travail !== false;
    if (travail) {
      const w = shiftWindow(o.date, vac);
      r.start = w.start; r.end = w.end; r.hProg = Math.max(0, w.dur - (vac.pause || 0)) / 60;
      r.garde = vac.type === 'garde';
    }
    if (rec.arr) {
      r.pointe = true;
      const arr = new Date(rec.arr), dep = rec.dep ? new Date(rec.dep) : null;
      if (dep) {
        const brut = (dep - arr) / 60000;
        const pause = (vac && vac.pause && brut > vac.pause * 2) ? vac.pause : 0;
        r.hPres = Math.max(0, brut - pause) / 60;
      }
      if (!travail) { r.code = 'hors_planning'; }
      else {
        r.attendu = true;
        const late = Math.round((arr - r.start) / 60000);
        if (late > (cfg.tolerance || 0)) r.retard = late;
        if (dep) {
          const early = Math.round((r.end - dep) / 60000);
          if (early > (cfg.seuilDepart || 0)) r.anticipe = early;
          r.code = r.anticipe ? 'depart_anticipe' : (r.retard ? 'retard' : 'present');
        } else {
          r.code = now > new Date(r.end.getTime() + (cfg.delaiDepart || 60) * 60000) ? 'incomplet' : (r.retard ? 'retard' : 'present');
        }
        /* temps programmé non couvert : retard + départ anticipé, comptés une seule fois */
        const manque = (r.retard + r.anticipe) / 60;
        if (rec.justifie) r.hAbsJ = manque; else r.hAbsNJ = manque;
      }
      if (rec.valide) { r.hVal = r.hPres; r.hSup = Math.max(0, r.hPres - r.hProg); }
      return r;
    }
    if (o.abs) {
      r.code = o.abs.cat;
      if (travail) { if (o.abs.cat === 'absence_nj') { r.hAbsNJ = r.hProg; r.attendu = true; } else r.hAbsJ = r.hProg; }
      return r;
    }
    if (!vac) { r.code = 'non_programme'; return r; }
    if (!travail) { r.code = vac.type === 'astreinte' ? 'astreinte' : 'repos'; return r; }
    r.attendu = true;
    if (rec.absent) {
      if (rec.justifie) { r.code = 'absence_j'; r.hAbsJ = r.hProg; r.attendu = false; }
      else { r.code = 'absence_nj'; r.hAbsNJ = r.hProg; }
    } else if (now < r.start) r.code = 'a_venir';
    else if (now < new Date(r.start.getTime() + (cfg.delaiAbsence || 30) * 60000)) r.code = 'attendu';
    else { r.code = 'absent_presume'; r.hPresume = r.hProg; }
    return r;
  }

  /* Synthèse d'une liste de journées évaluées. */
  function synthese(list) {
    const s = { jProg: 0, jEchus: 0, jPres: 0, jAbsJ: 0, jAbsNJ: 0, jPresume: 0, nRetards: 0, minRetard: 0, nAnticipes: 0, nIncomplets: 0,
      hProg: 0, hPres: 0, hVal: 0, hSup: 0, hAbsJ: 0, hAbsNJ: 0, taux: null };
    list.forEach(r => {
      const prog = r.start !== null;
      if (prog) { s.jProg++; s.hProg += r.hProg; }
      if (prog && r.code !== 'a_venir' && r.code !== 'attendu') s.jEchus++;
      if (r.pointe) s.jPres++;
      if (['absence_j', 'conge', 'permission'].includes(r.code) && prog) s.jAbsJ++;
      if (r.code === 'absence_nj') s.jAbsNJ++;
      if (r.code === 'absent_presume') s.jPresume++;
      if (r.retard) { s.nRetards++; s.minRetard += r.retard; }
      if (r.anticipe) s.nAnticipes++;
      if (r.code === 'incomplet') s.nIncomplets++;
      s.hPres += r.hPres; s.hVal += r.hVal; s.hSup += r.hSup; s.hAbsJ += r.hAbsJ; s.hAbsNJ += r.hAbsNJ;
    });
    const base = s.jEchus - s.jAbsJ;
    s.taux = base > 0 ? Math.round(1000 * Math.min(s.jPres, base) / base) / 10 : null;
    return s;
  }

  function joursCal(a, b) { return range(a, b).length; }
  function joursOuvres(a, b, feries) {
    const f = feries || [];
    return range(a, b).filter(d => { const w = s2d(d).getDay(); return w !== 0 && w !== 6 && !f.includes(d); }).length;
  }
  const fmtMin = m => { m = Math.round(m); if (!m) return '0 min'; const h = Math.floor(m / 60), r = m % 60; return h ? h + ' h ' + pad(r) : r + ' min'; };
  const fmtH = h => { const m = Math.round(h * 60); return Math.floor(m / 60) + ' h ' + pad(m % 60); };

  g.PV = { pad, d2s, s2d, addDays, hm2min, today, range, shiftWindow, evalJour, synthese, joursCal, joursOuvres, fmtMin, fmtH, LABELS };
})(typeof window !== 'undefined' ? window : globalThis);
