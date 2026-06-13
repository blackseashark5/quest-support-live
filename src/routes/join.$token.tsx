import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$token")({
  head: () => ({
    meta: [
      { title: "Joining support session" },
      { name: "description", content: "Connecting you to your support agent." },
    ],
  }),
  component: JoinTokenPage,
});

function JoinTokenPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_invite", { _token: token, _display_name: name || "Guest" });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Invalid invite");
      localStorage.setItem(
        `aqsc:guest:${row.session_id}`,
        JSON.stringify({ participantId: row.participant_id, displayName: name || "Guest", sessionTitle: row.title }),
      );
      router.navigate({ to: "/room/$sessionId", params: { sessionId: row.session_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join — invalid or expired invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-display font-semibold tracking-tight">Almost there</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your name so your agent knows who joined.</p>
          <form onSubmit={handleJoin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Joining..." : "Join session"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}