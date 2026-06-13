import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMySessions } from "@/lib/sessions.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — AtomQuest Support Connect" }] }),
  component: Dashboard,
});

function fmt(d: string | null) { return d ? new Date(d).toLocaleString() : "—"; }

type SessionRow = {
  id: string; title: string; customer_name: string | null;
  status: string; created_at: string; duration_seconds: number | null;
};

function Dashboard() {
  const list = useServerFn(listMySessions);
  const { data, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => list() });
  const sessions = (data?.sessions ?? []) as SessionRow[];
  const active = sessions.filter((s) => s.status === "active" || s.status === "waiting" || s.status === "created");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Launch a new session or rejoin one in progress.</p>
          </div>
          <Button asChild>
            <Link to="/sessions/new"><Plus className="mr-2 h-4 w-4" />New session</Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Active" value={active.length} />
          <Stat label="All time" value={sessions.length} />
          <Stat label="Completed" value={past.length} />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Active & waiting</h2>
          <div className="mt-4 grid gap-3">
            {isLoading && <Skeleton className="h-24 rounded-lg" />}
            {!isLoading && active.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No active sessions. Create one to get started.
              </div>
            )}
            {active.map((s) => <Row key={s.id} session={s} fmt={fmt} />)}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Recent</h2>
          <div className="mt-4 grid gap-3">
            {past.slice(0, 5).map((s) => <Row key={s.id} session={s} fmt={fmt} />)}
            {past.length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground">No past sessions yet.</div>
            )}
          </div>
          <div className="mt-4">
            <Link to="/history" className="text-sm text-primary hover:underline">View all history →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-display font-semibold">{value}</div>
    </div>
  );
}

function Row({ session, fmt }: { session: SessionRow; fmt: (d: string | null) => string }) {
  const tone = session.status === "active" ? "default" : session.status === "waiting" ? "secondary" : "outline";
  return (
    <Link to="/sessions/$id" params={{ id: session.id }} className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/40 transition">
      <div className="flex items-center gap-4 min-w-0">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground shrink-0">
          <Video className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{session.title}</div>
          <div className="text-xs text-muted-foreground truncate">
            {session.customer_name || "Unnamed customer"} · <Clock className="inline h-3 w-3" /> {fmt(session.created_at)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge variant={tone as "default" | "secondary" | "outline"}>{session.status}</Badge>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
      </div>
    </Link>
  );
}