import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join a support session" },
      { name: "description", content: "Enter your invite token to join a live support session." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-display font-semibold tracking-tight">Join a session</h1>
          <p className="mt-1 text-sm text-muted-foreground">Paste the invite token or link your agent sent you.</p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const t = token.trim().split("/").pop()?.split("?")[0] ?? "";
              if (t) router.navigate({ to: "/join/$token", params: { token: t } });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="token">Invite token</Label>
              <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="e.g. a3f9c12b..." required />
            </div>
            <Button type="submit" className="w-full">Continue</Button>
          </form>
        </div>
      </main>
    </div>
  );
}