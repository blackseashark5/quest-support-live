import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Video, LogOut } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function AppHeader() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Video className="h-4 w-4" />
          </span>
          <span className="font-display">AtomQuest</span>
          <span className="text-muted-foreground font-normal text-sm">Support Connect</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {email && (
            <>
              <Link to="/dashboard" className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground">Dashboard</Link>
              <Link to="/history" className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground">History</Link>
            </>
          )}
          <Link to="/join" className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground">Join session</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {email ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Agent sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}