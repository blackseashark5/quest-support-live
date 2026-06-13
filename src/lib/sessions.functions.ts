import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  customer_name: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: session, error } = await supabase
      .from("sessions")
      .insert({
        title: data.title,
        customer_name: data.customer_name || null,
        notes: data.notes || null,
        agent_id: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const { data: invite, error: invErr } = await supabase
      .from("session_invites")
      .insert({ session_id: session.id })
      .select("token, expires_at")
      .single();
    if (invErr) throw new Error(invErr.message);

    await supabase.from("session_events").insert({
      session_id: session.id,
      event_type: "SESSION_CREATED",
      payload: { title: data.title },
    });

    return { session, invite };
  });

export const listMySessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { sessions: data ?? [] };
  });

export const getSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: session, error: sErr }, { data: invite }, { data: participants }, { data: events }, { data: messages }] = await Promise.all([
      context.supabase.from("sessions").select("*").eq("id", data.id).single(),
      context.supabase.from("session_invites").select("token, expires_at, used").eq("session_id", data.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("session_participants").select("*").eq("session_id", data.id).order("joined_at"),
      context.supabase.from("session_events").select("*").eq("session_id", data.id).order("created_at"),
      context.supabase.from("messages").select("*").eq("session_id", data.id).order("created_at"),
    ]);
    if (sErr) throw new Error(sErr.message);
    return { session, invite: invite ?? null, participants: participants ?? [], events: events ?? [], messages: messages ?? [] };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const now = new Date();
    const { data: existing } = await context.supabase.from("sessions").select("started_at").eq("id", data.id).single();
    const startedAt = existing?.started_at ? new Date(existing.started_at) : now;
    const duration = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
    const { error } = await context.supabase
      .from("sessions")
      .update({ status: "ended", ended_at: now.toISOString(), duration_seconds: duration })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("session_events").insert({ session_id: data.id, event_type: "CALL_ENDED", payload: {} });
    return { ok: true };
  });

export const markSessionActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("session_events").insert({ session_id: data.id, event_type: "CALL_STARTED", payload: {} });
    return { ok: true };
  });

export const logSessionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ session_id: z.string().uuid(), event_type: z.string().min(1).max(64), payload: z.record(z.any()).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("session_events").insert({
      session_id: data.session_id,
      event_type: data.event_type,
      payload: data.payload ?? {},
    });
    return { ok: true };
  });