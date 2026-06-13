import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMySessions } from "@/lib/sessions.functions";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Session history" }] }),
  component: History,
});

function History() {
  const list = useServerFn(listMySessions);
  const { data, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const sessions = (data?.sessions ?? []).filter((s) =>
    (s.title + " " + (s.customer_name ?? "")).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-display font-semibold tracking-tight">Session history</h1>
          <Input placeholder="Search by title or customer..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="p-4"><Skeleton className="h-8" /></td></tr>
              )}
              {!isLoading && sessions.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No sessions found.</td></tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <Link to="/sessions/$id" params={{ id: s.id }} className="font-medium hover:underline">{s.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.customer_name || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={s.status === "ended" ? "outline" : "default"}>{s.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.duration_seconds ? `${Math.round(s.duration_seconds/60)}m` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}