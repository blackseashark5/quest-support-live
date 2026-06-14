import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCallRoom } from "@/hooks/useCallRoom";
import { useServerFn } from "@tanstack/react-start";
import { markSessionActive, endSession, logSessionEvent } from "@/lib/sessions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, MessageSquare, Send, Loader2, AlertTriangle, Camera, Activity } from "lucide-react";
import type { DeviceOption } from "@/hooks/useCallRoom";

export const Route = createFileRoute("/room/$sessionId")({
  head: () => ({ meta: [{ title: "Live support session" }] }),
  ssr: false,
  component: Room,
});

function Room() {
  const { sessionId } = Route.useParams();
  const router = useRouter();
  const [role, setRole] = useState<"agent" | "customer" | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setRole("agent");
        setDisplayName(((data.user.user_metadata as { name?: string })?.name) || data.user.email?.split("@")[0] || "Agent");
      } else {
        const stored = localStorage.getItem(`aqsc:guest:${sessionId}`);
        if (stored) {
          const parsed = JSON.parse(stored) as { displayName: string };
          setRole("customer");
          setDisplayName(parsed.displayName || "Guest");
        } else {
          router.navigate({ to: "/join" });
          return;
        }
      }
      setReady(true);
    })();
  }, [sessionId, router]);

  if (!ready || !role) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing room…</div>
      </div>
    );
  }

  return <RoomInner sessionId={sessionId} role={role} displayName={displayName} />;
}

function RoomInner({ sessionId, role, displayName }: { sessionId: string; role: "agent" | "customer"; displayName: string }) {
  const router = useRouter();
  const markActive = useServerFn(markSessionActive);
  const end = useServerFn(endSession);
  const logEvent = useServerFn(logSessionEvent);

  const call = useCallRoom({ sessionId, role, displayName });
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (localRef.current && call.localStream) localRef.current.srcObject = call.localStream;
  }, [call.localStream]);
  useEffect(() => {
    if (remoteRef.current && call.remoteStream) remoteRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  useEffect(() => {
    if (role === "agent" && call.status === "connected") {
      markActive({ data: { id: sessionId } }).catch(() => {});
    }
  }, [call.status, role, sessionId, markActive]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") call.toggleMute();
      if (e.key === "v" || e.key === "V") call.toggleCam();
      if (e.key === "s" || e.key === "S") call.toggleShare();
      if (e.key === "c" || e.key === "C") setChatOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [call]);

  async function handleEnd() {
    call.hangup();
    if (role === "agent") {
      try { await end({ data: { id: sessionId } }); } catch {}
      router.navigate({ to: "/dashboard" });
    } else {
      try { await logEvent({ data: { session_id: sessionId, event_type: "USER_LEFT" } }); } catch {}
      router.navigate({ to: "/" });
    }
  }

  function sendChat() {
    const body = draft.trim();
    if (!body) return;
    call.sendChat(body);
    setDraft("");
  }

  const statusLabel = {
    idle: "Idle",
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
    failed: "Connection failed",
  }[call.status];

  const statusDot = call.status === "connected" ? "bg-emerald-500" : call.status === "failed" ? "bg-destructive" : "bg-amber-500";

  if (!call.started) {
    return (
      <PreJoin
        connecting={call.status === "connecting"}
        error={call.error}
        onCancel={() => router.navigate({ to: role === "agent" ? "/dashboard" : "/" })}
        onJoin={(devs) => { void call.start(devs); }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 h-14 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold truncate">Support session</span>
          <span className="hidden sm:inline text-xs text-muted-foreground font-mono truncate">{sessionId.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${statusDot}`} />
          <span className="text-muted-foreground">{statusLabel}</span>
          {call.peerName && <span className="ml-2 hidden md:inline text-muted-foreground">· peer: {call.peerName}</span>}
          <DiagnosticsButton stats={call.stats} status={call.status} hasLocal={!!call.localStream} hasRemote={!!call.remoteStream} />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <main className="relative flex-1 bg-black">
          {call.remoteStream ? (
            <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-60" />
                <p className="mt-4 text-sm">{role === "agent" ? "Waiting for customer to join…" : "Connecting to your agent…"}</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 w-48 sm:w-56 aspect-video overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <video ref={localRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          </div>
        </main>

        {chatOpen && (
          <aside className="hidden md:flex w-80 flex-col border-l border-border bg-card">
            <div className="border-b border-border px-4 py-3 font-semibold text-sm">Chat</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {call.messages.length === 0 && <p className="text-xs text-muted-foreground">Messages appear here.</p>}
              {call.messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.self ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.self ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.body}
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground">{m.from} · {new Date(m.ts).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              className="flex gap-2 border-t border-border p-3"
            >
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" />
              <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
            </form>
          </aside>
        )}
      </div>

      <footer className="flex items-center justify-center gap-2 border-t border-border bg-card px-4 py-3">
        <Control on={!call.muted} onClick={call.toggleMute} label={call.muted ? "Unmute" : "Mute"} Icon={call.muted ? MicOff : Mic} />
        <Control on={!call.camOff} onClick={call.toggleCam} label={call.camOff ? "Camera on" : "Camera off"} Icon={call.camOff ? VideoOff : VideoIcon} />
        <Control on={call.sharing} onClick={call.toggleShare} label="Share screen" Icon={MonitorUp} accent={call.sharing} />
        <Control on={true} onClick={() => setChatOpen((o) => !o)} label="Chat" Icon={MessageSquare} accent={chatOpen} />
        <Button variant="destructive" onClick={handleEnd} className="ml-2">
          <PhoneOff className="mr-2 h-4 w-4" /> {role === "agent" ? "End" : "Leave"}
        </Button>
      </footer>
    </div>
  );
}

function Control({ Icon, label, onClick, accent }: { Icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void; on: boolean; accent?: boolean }) {
  return (
    <Button
      variant={accent ? "default" : "secondary"}
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}