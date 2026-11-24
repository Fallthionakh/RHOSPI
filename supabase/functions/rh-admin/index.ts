// RHOSPI / SENHOP RH – gestion des comptes d'accès par la direction ou les RH de l'organisation.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const refus = (message: string) => json({ ok: false, error: message });
const ROLES = ["superadmin", "directeur", "saf", "rh", "chef", "major", "agent"];
const GESTION = ["superadmin", "directeur", "rh"];
const AVEC_AGENT = ["chef", "major", "agent"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who?.user) return json({ ok: false, error: "Session expirée : reconnectez-vous." }, 401);
    const b = await req.json().catch(() => ({}));
    const org = String(b.org || "");
    const { data: me } = await admin.from("rh_membres").select("role").eq("user_id", who.user.id).eq("org_id", org).eq("actif", true).maybeSingle();
    if (!me || !GESTION.includes(me.role)) return json({ ok: false, error: "Réservé à la direction et aux ressources humaines." }, 403);
    const action = String(b.action || "");
    const role = String(b.role || "");
    const agentId = b.agent_id ? String(b.agent_id) : null;
    const peutRole = (r: string) => ROLES.includes(r) && (r !== "superadmin" || me.role === "superadmin");

    if (action === "creer") {
      const email = String(b.email || "").trim().toLowerCase();
      const nom = String(b.nom || "").trim().slice(0, 120);
      const password = String(b.password || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return refus("Adresse e-mail invalide.");
      if (!nom) return refus("Indiquez le nom de la personne.");
      if (!peutRole(role)) return refus("Profil non autorisé.");
      if (AVEC_AGENT.includes(role) && !agentId) return refus("Choisissez l'agent correspondant à ce compte.");
      let userId: string | null = null, existant = false;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nom } });
      if (created?.user) userId = created.user.id;
      else {
        const msg = (cErr?.message || "") + " " + ((cErr as { code?: string })?.code || "");
        if (!/already|exists|registered/i.test(msg)) {
          if (password.length < 8) return refus("Mot de passe : 8 caractères au minimum.");
          return refus("Création impossible : " + (cErr?.message || "erreur inconnue"));
        }
        for (let page = 1; page <= 50 && !userId; page++) {
          const { data: l, error: lErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          if (lErr || !l?.users?.length) break;
          const f = l.users.find((u) => (u.email || "").toLowerCase() === email);
          if (f) userId = f.id;
        }
        if (!userId) return refus("Cette adresse est déjà utilisée.");
        existant = true;
      }
      if (!existant && password.length < 8) { await admin.auth.admin.deleteUser(userId!); return refus("Mot de passe : 8 caractères au minimum."); }
      const { data: deja } = await admin.from("rh_membres").select("user_id").eq("user_id", userId).eq("org_id", org).maybeSingle();
      if (deja) return refus("Cette personne a déjà un accès à cette organisation.");
      const { error: pErr } = await admin.from("rh_membres").insert({ user_id: userId, org_id: org, role, agent_id: agentId, nom, email });
      if (pErr) { if (!existant) await admin.auth.admin.deleteUser(userId!); return refus("Création impossible : " + pErr.message); }
      return json({ ok: true, user_id: userId, existant });
    }

    const userId = String(b.user_id || "");
    const { data: cible } = await admin.from("rh_membres").select("role").eq("user_id", userId).eq("org_id", org).maybeSingle();
    if (!cible) return refus("Compte introuvable.");
    if (cible.role === "superadmin" && me.role !== "superadmin") return refus("Seul un super administrateur peut modifier ce compte.");
    if (userId === who.user.id && action !== "motdepasse") return refus("Vous ne pouvez pas modifier votre propre accès.");

    if (action === "modifier") {
      const maj: Record<string, unknown> = {};
      if (b.role !== undefined) { if (!peutRole(role)) return refus("Profil non autorisé."); maj.role = role; }
      if (b.agent_id !== undefined) maj.agent_id = agentId;
      if (b.nom !== undefined) maj.nom = String(b.nom).trim().slice(0, 120);
      if (b.actif !== undefined) maj.actif = !!b.actif;
      const r = (maj.role as string) || cible.role;
      if (AVEC_AGENT.includes(r) && (maj.agent_id === null)) return refus("Ce profil doit être relié à un agent.");
      const { error } = await admin.from("rh_membres").update(maj).eq("user_id", userId).eq("org_id", org);
      if (error) return refus("Modification impossible : " + error.message);
      return json({ ok: true });
    }
    if (action === "motdepasse") {
      const password = String(b.password || "");
      if (password.length < 8) return refus("Mot de passe : 8 caractères au minimum.");
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) return refus("Modification impossible : " + error.message);
      return json({ ok: true });
    }
    return refus("Action inconnue.");
  } catch (e) {
    return json({ ok: false, error: "Erreur du serveur : " + ((e as Error)?.message || "inconnue") }, 500);
  }
});
