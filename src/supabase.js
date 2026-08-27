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
  if (data.session) return data.session.user;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signed.user;
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
  const { data, error } = await supabase
    .from("pitches")
    .insert({ owner: userId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { error } = await supabase
    .from("messages")
    .insert({ room, user_id: userId, body });
  if (error) throw error;
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
