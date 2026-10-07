import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rulesQueryOptions, saveRules } from "@/lib/rules";

export const Route = createFileRoute("/_authenticated/rules")({
  loader: ({ context }) => context.queryClient.ensureQueryData(rulesQueryOptions(context.user.id)),
  head: () => ({
    meta: [
      { title: "My Trading Rules — TedJournal" },
      { name: "description", content: "Your personal numbered trading rules, saved privately with your TedJournal account." },
      { property: "og:title", content: "My Trading Rules — TedJournal" },
      { property: "og:description", content: "Keep your personal trading discipline and rules together in TedJournal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const options = rulesQueryOptions(user.id);
  const { data: savedRules } = useSuspenseQuery(options);
  const [rules, setRules] = useState(() =>
    (savedRules.length ? savedRules : Array.from({ length: 3 }, () => ""))
      .map((text, index) => ({ id: index, text })),
  );
  const normalized = rules.map((rule) => rule.text.trim()).filter(Boolean);
  const dirty = JSON.stringify(normalized) !== JSON.stringify(savedRules);
  const save = useMutation({
    mutationFn: (values: string[]) => saveRules(user.id, values),
    onSuccess: (_, values) => {
      queryClient.setQueryData(options.queryKey, values);
      toast.success("Rules saved");
    },
    onError: () => toast.error("Could not save your rules. Please try again."),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">My rules</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            {dirty ? "Unsaved changes" : <><Check className="size-3.5" />{savedRules.length ? "Saved" : "No saved rules"}</>}
          </span>
          <Button onClick={() => save.mutate(normalized)} disabled={!dirty || save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            {save.isPending ? "Saving…" : "Save rules"}
          </Button>
        </div>
      </div>
      <ol className="divide-y divide-border border-y border-border">
        {rules.map((rule, index) => (
          <li key={rule.id} className="flex items-start gap-3 py-4 sm:gap-4">
            <label htmlFor={`rule-${rule.id}`} className="num w-8 shrink-0 pt-2 text-right text-lg text-primary">
              {index + 1}.
            </label>
            <Textarea
              id={`rule-${rule.id}`}
              aria-label={`Rule ${index + 1}`}
              placeholder="Write your rule…"
              value={rule.text}
              disabled={save.isPending}
              maxLength={2000}
              className="min-h-20 flex-1 resize-y leading-6"
              onChange={(event) => setRules((current) => current.map((item) => item.id === rule.id ? { ...item, text: event.target.value } : item))}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              title={`Remove rule ${index + 1}`}
              aria-label={`Remove rule ${index + 1}`}
              disabled={save.isPending}
              onClick={() => setRules((current) => current.filter((item) => item.id !== rule.id))}
            ><Trash2 /></Button>
          </li>
        ))}
      </ol>
      <Button variant="outline" disabled={save.isPending} onClick={() => {
        setRules((current) => [...current, { id: nextId, text: "" }]);
        setNextId((current) => current + 1);
      }}><Plus />Add rule</Button>
    </div>
  );
}