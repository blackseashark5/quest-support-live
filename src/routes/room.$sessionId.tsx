import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

function PreJoin({
  onJoin,
  onCancel,
  connecting,
  error,
}: {
  onJoin: (devs: { videoDeviceId?: string; audioDeviceId?: string }) => void;
  onCancel: () => void;
  connecting: boolean;
  error: string | null;
}) {
  const [cams, setCams] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [videoDeviceId, setVideoDeviceId] = useState<string>("");
  const [audioDeviceId, setAudioDeviceId] = useState<string>("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied" | "prompt" | "error">("unknown");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    const c = list.filter((d) => d.kind === "videoinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
    const m = list.filter((d) => d.kind === "audioinput").map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
    setCams(c);
    setMics(m);
    setVideoDeviceId((cur) => cur || c[0]?.deviceId || "");
    setAudioDeviceId((cur) => cur || m[0]?.deviceId || "");
  }, []);

  const acquirePreview = useCallback(async (v?: string, a?: string) => {
    setPreviewError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: v ? { deviceId: { exact: v } } : true,
        audio: a ? { deviceId: { exact: a } } : true,
      });
      setPreviewStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return stream;
      });
      setPermission("granted");
      await refreshDevices();
    } catch (e) {
      const err = e as DOMException;
      if (err.name === "NotAllowedError" || err.name === "SecurityError") setPermission("denied");
      else setPermission("error");
      setPreviewError(
        err.name === "NotAllowedError" || err.name === "SecurityError"
          ? "Camera and microphone permission was blocked. Allow access in your browser's site settings, then click Retry."
          : err.name === "NotFoundError"
          ? "No camera or microphone was found on this device."
          : err.name === "NotReadableError"
          ? "Your camera or microphone is in use by another application."
          : `Could not access devices: ${err.message || err.name}`,
      );
    }
  }, [refreshDevices]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (navigator.permissions) {
          const cam = await navigator.permissions.query({ name: "camera" as PermissionName }).catch(() => null);
          if (mounted && cam) setPermission(cam.state as "granted" | "denied" | "prompt");
        }
      } catch { /* noop */ }
      await refreshDevices();
      if (mounted) await acquirePreview();
    })();
    const onChange = () => { void refreshDevices(); };
    navigator.mediaDevices?.addEventListener?.("devicechange", onChange);
    return () => {
      mounted = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", onChange);
      setPreviewStream((s) => { s?.getTracks().forEach((t) => t.stop()); return null; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = previewStream;
  }, [previewStream]);

  const onSelectCam = (id: string) => { setVideoDeviceId(id); void acquirePreview(id, audioDeviceId); };
  const onSelectMic = (id: string) => { setAudioDeviceId(id); void acquirePreview(videoDeviceId, id); };

  const handleJoin = () => {
    previewStream?.getTracks().forEach((t) => t.stop());
    setPreviewStream(null);
    onJoin({ videoDeviceId: videoDeviceId || undefined, audioDeviceId: audioDeviceId || undefined });
  };

  const blocked = permission === "denied";
  const combinedError = error || previewError;

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Check your camera and microphone</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick the devices you'd like to use, then join the session.</p>

        <div className="mt-5 grid gap-5 md:grid-cols-[1fr,1fr]">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
            {previewStream ? (
              <video ref={previewRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground text-sm">
                {blocked ? "Camera blocked" : "No preview"}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Camera</label>
              <Select value={videoDeviceId} onValueChange={onSelectCam} disabled={!cams.length}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={cams.length ? "Select camera" : "No cameras detected"} /></SelectTrigger>
                <SelectContent>
                  {cams.map((c) => <SelectItem key={c.deviceId} value={c.deviceId}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Microphone</label>
              <Select value={audioDeviceId} onValueChange={onSelectMic} disabled={!mics.length}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={mics.length ? "Select microphone" : "No microphones detected"} /></SelectTrigger>
                <SelectContent>
                  {mics.map((m) => <SelectItem key={m.deviceId} value={m.deviceId}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Permission: <span className="font-medium">{permission}</span>
            </div>
          </div>
        </div>

        {combinedError && (
          <div className="mt-4 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p>{combinedError}</p>
              {blocked && (
                <p className="mt-1 text-xs opacity-80">
                  In Chrome, click the camera icon in the address bar → Allow → reload. In Firefox, click the lock icon → Permissions.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="secondary" onClick={() => acquirePreview(videoDeviceId, audioDeviceId)} disabled={connecting}>
            Retry permissions
          </Button>
          <Button onClick={handleJoin} disabled={connecting || !previewStream}>
            {connecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Joining…</> : <><Camera className="mr-2 h-4 w-4" /> Join session</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DiagnosticsButton({
  stats,
  status,
  hasLocal,
  hasRemote,
}: {
  stats: import("@/hooks/useCallRoom").CallStats;
  status: string;
  hasLocal: boolean;
  hasRemote: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" className="ml-2 h-7 px-2" onClick={() => setOpen((o) => !o)} aria-label="Diagnostics">
        <Activity className="h-3.5 w-3.5 mr-1" /> Diagnostics
      </Button>
      {open && (
        <div className="fixed right-3 top-16 z-50 w-80 rounded-lg border border-border bg-card p-4 shadow-xl text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Connection diagnostics</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">×</button>
          </div>
          <dl className="mt-3 grid grid-cols-[1fr,auto] gap-y-1.5 gap-x-3">
            <Row label="Status" value={status} />
            <Row label="Peer connection" value={stats.pcState} />
            <Row label="ICE state" value={stats.iceState} />
            <Row label="ICE gathering" value={stats.iceGathering} />
            <Row label="Signaling" value={stats.signaling} />
            <Row label="Local candidate" value={stats.localCandidateType ?? "—"} />
            <Row label="Remote candidate" value={stats.remoteCandidateType ?? "—"} />
            <Row label="Protocol" value={stats.protocol ?? "—"} />
            <Row label="RTT" value={stats.rtt != null ? `${Math.round(stats.rtt * 1000)} ms` : "—"} />
            <Row label="Local track" value={hasLocal ? "active" : "none"} />
            <Row label="Remote track" value={hasRemote ? "active" : "none"} />
            <Row label="Audio out / in" value={`${fmt(stats.audioOutKbps)} / ${fmt(stats.audioInKbps)} kbps`} />
            <Row label="Video out / in" value={`${fmt(stats.videoOutKbps)} / ${fmt(stats.videoInKbps)} kbps`} />
            <Row label="Architecture" value="Browser P2P (no SFU)" />
            <Row label="Recording" value="Disabled (P1)" />
          </dl>
          <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
            This build uses browser-to-browser WebRTC with public STUN servers and Supabase Realtime for signaling. No SFU or server-side recording is active.
          </p>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-right">{value}</dd>
    </>
  );
}

function fmt(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n < 10 ? n.toFixed(1) : Math.round(n).toString();
}