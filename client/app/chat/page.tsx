"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { useSocket } from "@/components/providers/socket-provider";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiGet, apiPost } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { ChatMessage, ChatRoom, ChatRoomsResponse } from "@/types/crm";

function roomKey(room: ChatRoom) {
  return `${room.type}:${room.id}`;
}

function messageRoomKey(message: ChatMessage) {
  const id = message.channelType === "DEPARTMENT" ? message.departmentId : message.projectId;
  return `${message.channelType}:${id}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatPage() {
  const { user, loading: sessionLoading } = useSession();
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState<ChatRoomsResponse>({ departments: [], projects: [] });
  const [selectedKey, setSelectedKey] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const allRooms = useMemo(() => [...rooms.departments, ...rooms.projects], [rooms]);
  const selectedRoom = allRooms.find((room) => roomKey(room) === selectedKey) ?? null;

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGet<ChatRoomsResponse>("/chat/rooms");
        setRooms(data);
        const firstRoom = data.departments[0] ?? data.projects[0];
        setSelectedKey((current) => current || (firstRoom ? roomKey(firstRoom) : ""));
      } catch (err) {
        setError(normalizeErrorMessage(err, "Failed to load chat rooms"));
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      void loadRooms();
    }
  }, [user]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedRoom) {
        setMessages([]);
        return;
      }

      try {
        setMessagesLoading(true);
        setError("");
        const params = new URLSearchParams({
          type: selectedRoom.type,
          id: selectedRoom.id,
        });
        const data = await apiGet<ChatMessage[]>(`/chat/messages?${params.toString()}`);
        setMessages(data);
      } catch (err) {
        setMessages([]);
        setError(normalizeErrorMessage(err, "Failed to load messages"));
      } finally {
        setMessagesLoading(false);
      }
    }

    void loadMessages();
  }, [selectedRoom?.id, selectedRoom?.type]);

  useEffect(() => {
    if (!socket || !selectedRoom) {
      return;
    }

    const handleMessage = (message: ChatMessage) => {
      if (messageRoomKey(message) !== roomKey(selectedRoom)) {
        return;
      }

      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );
    };

    socket.on("chat:message", handleMessage);

    return () => {
      socket.off("chat:message", handleMessage);
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedKey]);

  const sendMessage = async () => {
    if (!selectedRoom || !draft.trim()) {
      return;
    }

    try {
      setSending(true);
      setError("");
      const message = await apiPost<ChatMessage>("/chat/messages", {
        channelType: selectedRoom.type,
        channelId: selectedRoom.id,
        content: draft,
      });
      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );
      setDraft("");
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  if (sessionLoading || !user) {
    return <StatePanel title="Loading chat" description="Preparing your CRM conversations." />;
  }

  return (
    <CRMShell user={user}>
      <div className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[360px_1fr]">
        <section
          className="rounded-[22px] border p-4"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Community
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[var(--text-main)]">Team chat</h1>
            </div>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{
                background: connected
                  ? "color-mix(in srgb, var(--success) 14%, var(--surface))"
                  : "var(--surface-soft)",
                color: connected ? "var(--success)" : "var(--text-soft)",
              }}
            >
              {connected ? "Live" : "Offline"}
            </span>
          </div>

          {error ? <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p> : null}

          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                Departments
              </p>
              <div className="space-y-2">
                {rooms.departments.map((room) => {
                  const active = roomKey(room) === selectedKey;
                  return (
                    <button
                      key={roomKey(room)}
                      type="button"
                      onClick={() => setSelectedKey(roomKey(room))}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        background: active ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface-soft)",
                      }}
                    >
                      <p className="text-sm font-semibold text-[var(--text-main)]">{room.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">{room.subtitle}</p>
                    </button>
                  );
                })}
                {!loading && !rooms.departments.length ? (
                  <p className="rounded-2xl border px-4 py-3 text-sm text-[var(--text-soft)]" style={{ borderColor: "var(--border)" }}>
                    No department room available.
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
                Projects
              </p>
              <div className="space-y-2">
                {rooms.projects.map((room) => {
                  const active = roomKey(room) === selectedKey;
                  return (
                    <button
                      key={roomKey(room)}
                      type="button"
                      onClick={() => setSelectedKey(roomKey(room))}
                      className="w-full rounded-2xl border px-4 py-3 text-left transition"
                      style={{
                        borderColor: active ? "var(--accent)" : "var(--border)",
                        background: active ? "color-mix(in srgb, var(--accent) 10%, var(--surface))" : "var(--surface-soft)",
                      }}
                    >
                      <p className="text-sm font-semibold text-[var(--text-main)]">{room.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">{room.subtitle}</p>
                    </button>
                  );
                })}
                {!loading && !rooms.projects.length ? (
                  <p className="rounded-2xl border px-4 py-3 text-sm text-[var(--text-soft)]" style={{ borderColor: "var(--border)" }}>
                    No project room available.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section
          className="flex min-h-[680px] flex-col overflow-hidden rounded-[22px] border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {selectedRoom ? (
            <>
              <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  {selectedRoom.type === "DEPARTMENT" ? "Department room" : "Project room"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--text-main)]">{selectedRoom.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{selectedRoom.subtitle}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messagesLoading ? (
                  <StatePanel title="Loading messages" description="Fetching the latest conversation." />
                ) : null}

                {!messagesLoading && !messages.length ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="max-w-sm text-center text-sm text-[var(--text-soft)]">
                      No messages yet. Start the conversation for this room.
                    </p>
                  </div>
                ) : null}

                {messages.map((message) => {
                  const own = message.author.id === user.id;
                  return (
                    <article key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[760px] rounded-2xl border px-4 py-3"
                        style={{
                          borderColor: own ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)",
                          background: own ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface-soft)",
                        }}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--text-main)]">{message.author.name}</p>
                          <span className="text-xs text-[var(--text-faint)]">{message.author.role}</span>
                          <span className="text-xs text-[var(--text-faint)]">{formatTime(message.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-main)]">
                          {message.content}
                        </p>
                      </div>
                    </article>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Write a message..."
                    className="min-h-12 flex-1 resize-none rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--text-main)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !draft.trim()}
                    className="h-12 rounded-2xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "var(--accent)" }}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <StatePanel title="No chat rooms" description="Create a department or project to start a community room." />
            </div>
          )}
        </section>
      </div>
    </CRMShell>
  );
}
