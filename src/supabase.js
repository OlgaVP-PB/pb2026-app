// ============================================================
// Supabase client + data helpers for the PB 2026 conference app.
//
// The publishable key below is meant to be public - it identifies the
// project, it does not grant access. What actually protects the data is
// Row Level Security in the database (see supabase/schema.sql).
// Never put a secret / service_role key in this file.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nsdontscaseslagoduyz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2XhYWd7S9RR8nJv6TB8gDA_NP7EpjG8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "pb2026-auth",
  },
});

// --- Identity -------------------------------------------------
// Everyone gets an anonymous account on first open. It lives in this
// browser only, and is what lets the database tell "you" from "someone
// else" without ever asking for an email address.
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    // A stored session can look fine and still be dead - the account was removed,
    // the refresh token was revoked, or the device sat unopened too long. Ask the
    // server before trusting it, otherwise every write fails with "JWT expired"
    // and the person has no way to recover from inside the app.
    const { data: check, error } = await supabase.auth.getUser();
    if (!error && check && check.user) return check.user;
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signed.user;
}

// Returns a user the server will definitely accept, healing a dead session if
// needed. Call before a write that has to succeed.
export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data && data.user) return data.user;
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  const { data: signed, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
  return signed.user;
}

function isAuthProblem(e) {
  const s = `${(e && e.code) || ""} ${(e && e.message) || ""}`;
  return /PGRST30[13]|JWT|jwt|bad_jwt|401/.test(s);
}

// Run a write; if the session turns out to be dead, heal it and try once more
// with the refreshed identity.
async function withSessionRetry(run) {
  try {
    return await run(null);
  } catch (e) {
    if (!isAuthProblem(e)) throw e;
    const u = await currentUser();
    return await run(u);
  }
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, fields) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...fields, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- Organiser switches ---------------------------------------
export async function getConfig() {
  const { data, error } = await supabase.from("app_config").select("key, value");
  if (error) throw error;
  const out = {};
  (data || []).forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

// --- Pitches --------------------------------------------------
export async function listPitches() {
  const { data, error } = await supabase
    .from("pitches")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createPitch(userId, fields) {
  return withSessionRetry(async (fresh) => {
    const { data, error } = await supabase
      .from("pitches")
      .insert({ owner: fresh ? fresh.id : userId, ...fields })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function updatePitch(pitchId, fields) {
  return withSessionRetry(async () => {
    const { data, error } = await supabase
      .from("pitches")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", pitchId)
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

// --- Final Pitch Slam entry (one per team; only the team can read it) ---
export async function getSlamEntry(pitchId) {
  const { data, error } = await supabase
    .from("slam_entries")
    .select("*")
    .eq("pitch_id", pitchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveSlamEntry(pitchId, userId, fields) {
  return withSessionRetry(async (fresh) => {
    const { data, error } = await supabase
      .from("slam_entries")
      .upsert({
        pitch_id: pitchId,
        ...fields,
        updated_by: fresh ? fresh.id : userId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

// --- Round tables (Day 2 discussions) ---
export async function listRoundTables() {
  const { data, error } = await supabase.from("round_tables").select("*").order("id");
  if (error) throw error;
  return data || [];
}

export async function listTableSignups() {
  const { data, error } = await supabase.from("table_signups").select("user_id, round, table_id");
  if (error) throw error;
  return data || [];
}

// The seat cap lives in the database, so a full table is refused there even if
// two people tap at the same moment. That refusal arrives as "TABLE_FULL".
export async function joinTable(userId, round, tableId) {
  return withSessionRetry(async (fresh) => {
    const { error } = await supabase
      .from("table_signups")
      .insert({ user_id: fresh ? fresh.id : userId, round, table_id: tableId });
    if (error) throw error;
  });
}

export async function leaveTable(userId, round) {
  const { error } = await supabase.from("table_signups").delete().eq("user_id", userId).eq("round", round);
  if (error) throw error;
}

export function subscribeToSignups(onChange) {
  const channel = supabase
    .channel("signups")
    .on("postgres_changes", { event: "*", schema: "public", table: "table_signups" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// --- Panel questions (Day 3) ---
export async function listPanelQuestions() {
  const { data, error } = await supabase
    .from("panel_questions")
    .select("id, author, body, anonymous, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listPanelVotes() {
  const { data, error } = await supabase.from("panel_votes").select("question_id, user_id");
  if (error) throw error;
  return data || [];
}

export async function askPanelQuestion(userId, body, anonymous) {
  return withSessionRetry(async (fresh) => {
    const { data, error } = await supabase
      .from("panel_questions")
      .insert({ author: fresh ? fresh.id : userId, body, anonymous })
      .select()
      .single();
    if (error) throw error;
    return data;
  });
}

export async function deletePanelQuestion(id) {
  const { error } = await supabase.from("panel_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function votePanelQuestion(questionId, userId) {
  const { error } = await supabase.from("panel_votes").insert({ question_id: questionId, user_id: userId });
  if (error && error.code !== "23505") throw error; // 23505 = already voted
}

export async function unvotePanelQuestion(questionId, userId) {
  const { error } = await supabase.from("panel_votes").delete().eq("question_id", questionId).eq("user_id", userId);
  if (error) throw error;
}

export function subscribeToPanel(onChange) {
  const channel = supabase
    .channel("panel")
    .on("postgres_changes", { event: "*", schema: "public", table: "panel_questions" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "panel_votes" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// --- Organiser exports (passcode-protected, see supabase/migration_pitch_slam.sql) ---
export async function exportWarmup(code) {
  const { data, error } = await supabase.rpc("export_warmup", { p_code: code });
  if (error) throw error;
  return data || [];
}

export async function exportSlam(code) {
  const { data, error } = await supabase.rpc("export_slam", { p_code: code });
  if (error) throw error;
  return data || [];
}

export async function exportTables(code) {
  const { data, error } = await supabase.rpc("export_tables", { p_code: code });
  if (error) throw error;
  return data || [];
}

export async function exportPanel(code) {
  const { data, error } = await supabase.rpc("export_panel", { p_code: code });
  if (error) throw error;
  return data || [];
}

export async function listMembers() {
  const { data, error } = await supabase.from("pitch_members").select("*");
  if (error) throw error;
  return data || [];
}

export async function joinPitch(pitchId, userId) {
  const { error } = await supabase
    .from("pitch_members")
    .insert({ pitch_id: pitchId, user_id: userId });
  if (error && error.code !== "23505") throw error; // 23505 = already joined
}

export async function leavePitch(pitchId, userId) {
  const { error } = await supabase
    .from("pitch_members")
    .delete()
    .eq("pitch_id", pitchId)
    .eq("user_id", userId);
  if (error) throw error;
}

// --- Chat -----------------------------------------------------
export async function listMessages(room, limit = 200) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

export async function sendMessage(room, userId, body) {
  return withSessionRetry(async (fresh) => {
    const { error } = await supabase
      .from("messages")
      .insert({ room, user_id: fresh ? fresh.id : userId, body });
    if (error) throw error;
  });
}

export function subscribeToRoom(room, onInsert) {
  const channel = supabase
    .channel(`room:${room}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `room=eq.${room}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// --- Unread markers ------------------------------------------
// Latest activity per room, for the "new messages" dots. Only room, time and
// sender are fetched - no message text.
export async function listRecentActivity(limit = 1000) {
  const { data, error } = await supabase
    .from("messages")
    .select("room, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export function subscribeToAllMessages(onInsert) {
  const channel = supabase
    .channel("activity")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => onInsert(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// --- Reactions ------------------------------------------------
export async function listReactions() {
  const { data, error } = await supabase.from("reactions").select("*");
  if (error) throw error;
  return data || [];
}

export async function addReaction(sessionKey, userId, emoji) {
  const { error } = await supabase
    .from("reactions")
    .insert({ session_key: sessionKey, user_id: userId, emoji });
  if (error && error.code !== "23505") throw error;
}

export async function removeReaction(sessionKey, userId, emoji) {
  const { error } = await supabase
    .from("reactions")
    .delete()
    .eq("session_key", sessionKey)
    .eq("user_id", userId)
    .eq("emoji", emoji);
  if (error) throw error;
}

// --- Profiles by id, for showing names next to messages --------
export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("id, display_name, affiliation, tags, intro");
  if (error) throw error;
  return data || [];
}
