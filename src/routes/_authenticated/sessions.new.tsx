import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSession } from "@/lib/sessions.functions";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Video } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions/new")({
  head: () => ({ meta: [{ title: "New session — AtomQuest Support Connect" }] }),
  component: NewSession,
});

const schema = z.object({
  title: z.string().trim().min(1, "Required").max(120),
  customer_name: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});
type Vals = z.infer<typeof schema>;

function NewSession() {
  const router = useRouter();
  const create = useServerFn(createSession);
  const [result, setResult] = useState<{ sessionId: string; token: string; link: string; expires: string } | null>(null);
  const form = useForm<Vals>({ resolver: zodResolver(schema), defaultValues: { title: "", customer_name: "", notes: "" } });

  async function onSubmit(v: Vals) {
    try {
      const r = await create({ data: v });
      const link = `${window.location.origin}/join/${r.invite.token}`;
      setResult({ sessionId: r.session.id, token: r.invite.token, link, expires: r.invite.expires_at });
      toast.success("Session created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create session");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-display font-semibold tracking-tight">New support session</h1>
        <p className="text-muted-foreground mt-1">Create a session, then share the invite link with your customer.</p>

        {!result && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Session title</Label>
              <Input id="title" {...form.register("title")} placeholder="Help with onboarding setup" />
              {form.formState.errors.title && <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer name</Label>
              <Input id="customer_name" {...form.register("customer_name")} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...form.register("notes")} placeholder="Context for this session (optional)" rows={4} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>Create session</Button>
              <Button type="button" variant="outline" onClick={() => router.navigate({ to: "/dashboard" })}>Cancel</Button>
            </div>
          </form>
        )}

        {result && (
          <div className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
            <div>
              <h2 className="font-display text-lg font-semibold">Session ready</h2>
              <p className="text-sm text-muted-foreground">Share this invite. It expires {new Date(result.expires).toLocaleString()}.</p>
            </div>
            <Field label="Invite link" value={result.link} onCopy={() => copy(result.link)} />
            <Field label="Invite token" value={result.token} onCopy={() => copy(result.token)} />
            <div className="flex gap-2 pt-2">
              <Button asChild>
                <Link to="/room/$sessionId" params={{ sessionId: result.sessionId }}>
                  <Video className="mr-2 h-4 w-4" />Enter session
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={onCopy}><Copy className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}