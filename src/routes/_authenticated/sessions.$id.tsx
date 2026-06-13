import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getSession, endSession } from "@/lib/sessions.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sessions/$id")({
  head: () => ({ meta: [{ title: "Session — AtomQuest Support Connect" }] }),
  component: SessionDetail,
});

function SessionDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getSession);
  const end = useServerFn(endSession);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["session", id], queryFn: () => get({ data: { id } }) });

  async function handleEnd() {
    try { await end({ data: { id } }); toast.success("Session ended"); refetch(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {isLoading || !data ? <Skeleton className="h-64 rounded-xl" /> : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-display font-semibold tracking-tight">{data.session.title}</h1>
                  <Badge variant={data.session.status === "ended" ? "outline" : "default"}>{data.session.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.session.customer_name || "Unnamed customer"} · code <span className="font-mono">{data.session.session_code}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {data.session.status !== "ended" && (
                  <>
                    <Button asChild><Link to="/room/$sessionId" params={{ sessionId: id }}><Video className="mr-2 h-4 w-4" />Enter room</Link></Button>
                    <Button variant="destructive" onClick={handleEnd}>End session</Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <Card title="Participants">
                {data.participants.length === 0 ? <p className="text-sm text-muted-foreground">No customers have joined yet.</p> : (
                  <ul className="divide-y divide-border">
                    {data.participants.map((p) => (
                      <li key={p.id} className="py-2 text-sm flex justify-between">
                        <span>{p.display_name}</span>
                        <span className="text-muted-foreground">{new Date(p.joined_at).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Event log">
                {data.events.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {data.events.map((e) => (
                      <li key={e.id} className="text-xs flex justify-between gap-3 border-b border-border/50 pb-1.5">
                        <span className="font-mono">{e.event_type}</span>
                        <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              {data.invite && (
                <Card title="Invite">
                  <p className="text-xs font-mono break-all bg-muted rounded p-2">{data.invite.token}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Expires {new Date(data.invite.expires_at).toLocaleString()}</p>
                </Card>
              )}
              <Card title="Transcript">
                {data.messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages.</p> : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {data.messages.map((m) => (
                      <li key={m.id} className="text-sm">
                        <span className="font-medium">{m.sender_name}: </span>
                        <span>{m.body}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}