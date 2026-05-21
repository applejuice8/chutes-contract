// src/hooks/useChutesSession.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChutesUser } from "@/lib/chutesAuth";

interface SessionState {
  isLoading: boolean;
  isSignedIn: boolean;
  user: ChutesUser | null;
}

export function useChutesSession() {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isSignedIn: false,
    user: null,
  });

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/chutes/session");
      if (res.ok) {
        const data = await res.json();
        setState({ isLoading: false, isSignedIn: true, user: data.user });
      } else {
        setState({ isLoading: false, isSignedIn: false, user: null });
      }
    } catch {
      setState({ isLoading: false, isSignedIn: false, user: null });
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/chutes/logout", { method: "POST" });
    setState({ isLoading: false, isSignedIn: false, user: null });
    window.location.href = "/";
  }, []);

  return { ...state, logout, refetch: fetchSession };
}
