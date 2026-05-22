// src/hooks/useChutesSession.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChutesUser } from "@/lib/chutesAuth";

interface SessionState {
  isLoading: boolean;
  isSignedIn: boolean;
  user: ChutesUser | null;
}

async function loadSession(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/chutes/session");
    if (res.ok) {
      const data = await res.json();
      return { isLoading: false, isSignedIn: true, user: data.user };
    }
  } catch {
    // Fall through to the signed-out state below.
  }

  return { isLoading: false, isSignedIn: false, user: null };
}

export function useChutesSession() {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isSignedIn: false,
    user: null,
  });

  const fetchSession = useCallback(async () => {
    setState(await loadSession());
  }, []);

  useEffect(() => {
    let isActive = true;

    loadSession().then((session) => {
      if (isActive) {
        setState(session);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/chutes/logout", { method: "POST" });
    setState({ isLoading: false, isSignedIn: false, user: null });
    window.location.href = "/";
  }, []);

  return { ...state, logout, refetch: fetchSession };
}
