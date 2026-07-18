import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const FREE_USED_KEY = "praan:free_used";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, ready };
}

export function useUser(): User | null {
  return useAuth().user;
}

export function markFreeGenerationUsed() {
  if (typeof window !== "undefined") localStorage.setItem(FREE_USED_KEY, "1");
}

export function hasUsedFreeGeneration(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FREE_USED_KEY) === "1";
}

export function clearFreeGenerationFlag() {
  if (typeof window !== "undefined") localStorage.removeItem(FREE_USED_KEY);
}
