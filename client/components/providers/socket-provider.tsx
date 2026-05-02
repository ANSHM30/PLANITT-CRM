"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { getAuthEventName } from "@/lib/auth";
import { resolveApiOrigin } from "@/lib/api";

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
};

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

function getSocketUrl() {
  return resolveApiOrigin();
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [tokenVersion, setTokenVersion] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      setTokenVersion((value) => value + 1);
    };

    window.addEventListener(getAuthEventName(), handleAuthChange);
    return () => {
      window.removeEventListener(getAuthEventName(), handleAuthChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let nextSocket: Socket | null = null;

    void import("socket.io-client").then(({ io }) => {
      if (cancelled) {
        return;
      }

      nextSocket = io(getSocketUrl(), {
        transports: ["websocket"],
        withCredentials: true,
      });

      nextSocket.on("connect", () => {
        setConnected(true);
      });

      nextSocket.on("disconnect", () => {
        setConnected(false);
      });

      setSocket(nextSocket);
    });

    return () => {
      cancelled = true;
      nextSocket?.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [tokenVersion]);

  const value = useMemo(
    () => ({
      socket,
      connected,
    }),
    [socket, connected]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
