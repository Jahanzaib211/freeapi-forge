import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getInvalidationKeys } from "@/lib/query-invalidation";
import { useQueryClient } from "@tanstack/react-query";

export function useForgeEvents() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const es = new EventSource("/api/sse");
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const { type, path, data } = JSON.parse(event.data);
        if (type === "forge_event" && path) {
          const keys = getInvalidationKeys(path);
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        }
      } catch {}
    };

    es.onerror = () => {
    };

    return () => {
      es.close();
    };
  }, [isAuthenticated, queryClient]);
}
