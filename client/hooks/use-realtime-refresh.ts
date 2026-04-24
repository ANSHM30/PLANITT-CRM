"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { getToken } from "@/lib/auth";
import type { CRMUser } from "@/types/crm";

export function useRealtimeRefresh(
  user: CRMUser | null,
  events: string[],
  onRefresh: () => void | Promise<void>
) {
  const { socket } = useSocket();
  const refreshRef = useRef(onRefresh);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!socket || !user || !getToken()) {
      return;
    }

    socket.emit("crm:join", {
      userId: user.id,
      role: user.role,
    });

    const handler = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (inFlightRef.current) {
          return;
        }

        inFlightRef.current = true;
        void Promise.resolve(refreshRef.current()).finally(() => {
          inFlightRef.current = false;
        });
      }, 350);
    };

    events.forEach((eventName) => {
      socket.on(eventName, handler);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      events.forEach((eventName) => {
        socket.off(eventName, handler);
      });
    };
  }, [socket, user, events]);
}
