import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Video, ShieldCheck, MessageSquare, MonitorPlay, Lock, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AtomQuest Support Connect — Live video support" },
      { name: "description", content: "Self-hosted live video support for product teams. Invite-only sessions, in-call chat, screen sharing. No third-party media vendor." },
      { property: "og:title", content: "AtomQuest Support Connect" },
      { property: "og:description", content: "Self-hosted live video support. Invite-only sessions, in-call chat, screen share." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_-10%,oklch(0.55_0.22_277/.18),transparent_60%),radial-gradient(circle_at_80%_120%,oklch(0.55_0.22_277/.12),transparent_50%)]" />
          <div className="mx-auto max-w-7xl px-4 py-24 md:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Self-hosted media · No third-party vendor
              </div>
              <h1 className="mt-6 text-5xl md:text-6xl font-display font-semibold tracking-tight">
                Live video support, built for product teams.
              </h1>
              <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
                AtomQuest Support Connect lets agents launch secure video sessions, share screens, and chat in real time — without sending a byte of customer media through a third party.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">Start a session</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/join">Join with invite</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20">
          <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Everything support teams need.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { Icon: Video, t: "HD video & audio", d: "Direct peer-to-peer media with adaptive quality. Camera, mic, and speaker controls built in." },
              { Icon: MonitorPlay, t: "Screen sharing", d: "One-click screen share for guided troubleshooting, with live switch back to camera." },
              { Icon: MessageSquare, t: "In-call chat", d: "Persistent transcript synced in real time, with timestamps and sender attribution." },
              { Icon: Lock, t: "Invite-only access", d: "Time-boxed tokens, role-based authorization, and session-scoped permissions." },
              { Icon: ShieldCheck, t: "Enterprise auth", d: "JWT-backed sessions, RLS-protected APIs, and full event audit log per session." },
              { Icon: Activity, t: "Session analytics", d: "Duration, participants, and event timeline ready for review and compliance." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-border bg-card p-6">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Architecture</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Browser-to-browser WebRTC for media. Signaling, persistence, auth, and storage on our own backend. No external media SaaS in the path.
            </p>
            <pre className="mt-8 overflow-x-auto rounded-lg border border-border bg-card p-6 text-xs leading-relaxed text-muted-foreground">{`Browser (Agent)  ◄── WebRTC media ──►  Browser (Customer)
        │                                          │
        └───────── Realtime signaling ─────────────┘
                          │
              Postgres · Auth · Storage`}</pre>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground flex justify-between">
            <span>© AtomQuest</span>
            <span>Support Connect v1</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
