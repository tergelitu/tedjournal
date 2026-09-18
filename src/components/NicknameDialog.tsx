import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/trades";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NicknameDialog() {
  const { data: profile, isLoading } = useProfile();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const queryClient = useQueryClient();

  const needsNickname = !isLoading && profile !== undefined && profile !== null && !profile.has_nickname;

  useEffect(() => {
    if (needsNickname) setOpen(true);
  }, [needsNickname]);

  const save = useMutation({
    mutationFn: async (name: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: name, email: user.email ?? null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setOpen(false);
      toast.success("Nickname saved");
    },
    onError: () => toast.error("Could not save nickname. Try again."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = nickname.trim();
    if (name.length < 2) {
      toast.error("Nickname needs at least 2 characters.");
      return;
    }
    save.mutate(name.slice(0, 30));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Pick your nickname</DialogTitle>
          <DialogDescription>
            This name shows across your TedJournal account. You can change it later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Ted"
            maxLength={30}
          />
          <Button type="submit" className="w-full" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : null}
            Save nickname
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
