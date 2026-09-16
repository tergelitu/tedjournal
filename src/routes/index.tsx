import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, CalendarDays, ImageIcon, LineChart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PipDesk — Sign in to your pip-first trading journal" },
      {
        name: "description",
        content:
          "Sign in with Google to log trade screenshots and track win rate, net pips and pair stats.",
      },
      { property: "og:title", content: "PipDesk — Sign in to your trading journal" },
      {
        property: "og:description",
        content: "Screenshot-first trade logging with pip-focused stats, calendar and dashboard.",
      },
    ],
  }),
  component: SignInPage,
});

const highlights = [
  { icon: ImageIcon, title: "Screenshot first", copy: "Every entry starts with the chart image." },
  { icon: LineChart, title: "Pip-first stats", copy: "Net pips lead, dollars stay secondary." },
  { icon: Activity, title: "Win rate by pair", copy: "See which pairs actually pay you." },
  { icon: CalendarDays, title: "Calendar view", copy: "Daily count, win rate and net pips." },
];

function SignInPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/journal", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function signIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Sign in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/journal", replace: true });
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative w-full max-w-3xl">
        <div className="text-center">
          <p className="num text-xs uppercase tracking-[0.35em] text-primary">pipdesk</p>
          <h1 className="mt-5 text-4xl font-semibold sm:text-5xl">
            Journal your trades in <span className="text-gradient-cyan">pips</span>, not hype.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Upload the screenshot, log the setup, and let the dashboard and calendar show your real
            edge — pair by pair, week by week.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" onClick={signIn} disabled={loading || checking} className="px-8">
              {loading || checking ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Continue with Google
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Your name, email and every trade stay saved for the next time you sign in.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.title} className="surface-panel p-5">
              <item.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg className="mr-2 size-4" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 019.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.8-5.9l-7.6-5.9c-2 1.4-4.8 2.4-8.2 2.4-6.4 0-11.7-3.7-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
