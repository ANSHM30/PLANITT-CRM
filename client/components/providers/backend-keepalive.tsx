"use client";

import { useEffect, useRef } from "react";
import { resolveApiBaseUrl } from "@/lib/api";

const INTERVAL_MS = 10 * 60 * 1000;

/**
 * Pings the public health endpoint on an interval so free-tier / sleeping backends stay warm.
 */
export function BackendKeepAlive() {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const url = `${resolveApiBaseUrl()}/health`;

    const ping = () => {
      void fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        keepalive: true,
      }).catch(() => {
        /* ignore — best-effort wake-up */
      });
    };

    ping();
    const id = window.setInterval(ping, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
