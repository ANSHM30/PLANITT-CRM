"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CRMShell } from "@/components/layout/crm-shell";
import { useSocket } from "@/components/providers/socket-provider";
import { StatePanel } from "@/components/shared/state-panel";
import { useSession } from "@/hooks/use-session";
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "@/lib/api";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { CRMUser, ChatAttachmentUploadResponse, ChatGroup, ChatGroupMember, ChatMessage, ChatRoom, ChatRoomsResponse } from "@/types/crm";

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

function resolveAttachmentUrl(url?: string | null) {
  if (!url) {
    return "";
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return `${origin}${url}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ChatPage() {
  const { user, loading: sessionLoading } = useSession();
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState<ChatRoomsResponse>({ departments: [], projects: [], groups: [] });
  const [selectedKey, setSelectedKey] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [activeGroupMembers, setActiveGroupMembers] = useState<ChatGroupMember[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const allRooms = useMemo(() => [...rooms.departments, ...rooms.projects, ...rooms.groups], [rooms]);
  const selectedRoom = allRooms.find((room) => roomKey(room) === selectedKey) ?? null;
  const canManageGroups = user ? ["SUPERADMIN", "ADMIN", "MANAGER"].includes(user.role) : false;

  useEffect(() => {
    async function loadRooms() {
      try {
        setLoading(true);
        setError("");
        const data = await apiGet<ChatRoomsResponse>("/chat/rooms");
        setRooms(data);
        const firstRoom = data.departments[0] ?? data.projects[0] ?? data.groups[0];
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
    async function loadUsers() {
      if (!canManageGroups) {
        return;
      }
      try {
        const data = await apiGet<CRMUser[]>("/users");
        setUsers(data);
      } catch (_err) {
        setUsers([]);
      }
    }
    void loadUsers();
  }, [canManageGroups]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedRoom) {
        setMessages([]);
        setReplyTo(null);
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
        await apiPost<{ success: boolean }>("/chat/read", {
          channelType: selectedRoom.type,
          channelId: selectedRoom.id,
        });
        setRooms((current) => ({
          departments: current.departments.map((room) =>
            room.id === selectedRoom.id && room.type === selectedRoom.type ? { ...room, unreadCount: 0 } : room
          ),
          projects: current.projects.map((room) =>
            room.id === selectedRoom.id && room.type === selectedRoom.type ? { ...room, unreadCount: 0 } : room
          ),
          groups: current.groups.map((room) =>
            room.id === selectedRoom.id && room.type === selectedRoom.type ? { ...room, unreadCount: 0 } : room
          ),
        }));
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

    const handleMessageUpdate = (message: ChatMessage) => {
      if (messageRoomKey(message) !== roomKey(selectedRoom)) {
        return;
      }

      setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
      setReplyTo((current) => (current?.id === message.id ? message : current));
    };

    socket.on("chat:message", handleMessage);
    socket.on("chat:message:update", handleMessageUpdate);

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:message:update", handleMessageUpdate);
    };
  }, [socket, selectedRoom]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, selectedKey]);

  useEffect(() => {
    const onGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", onGlobalClick);
    return () => window.removeEventListener("click", onGlobalClick);
  }, []);

  const sendMessage = async () => {
    if (!selectedRoom || (!draft.trim() && !selectedFile)) {
      return;
    }

    try {
      setSending(true);
      setError("");
      let attachmentPayload: ChatAttachmentUploadResponse | null = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("channelType", selectedRoom.type);
        formData.append("channelId", selectedRoom.id);
        attachmentPayload = await apiPostForm<ChatAttachmentUploadResponse>("/chat/attachments", formData);
      }

      const message = await apiPost<ChatMessage>("/chat/messages", {
        channelType: selectedRoom.type,
        channelId: selectedRoom.id,
        content: draft,
        messageType: attachmentPayload?.messageType ?? "TEXT",
        attachmentUrl: attachmentPayload?.attachmentUrl ?? null,
        attachmentMimeType: attachmentPayload?.attachmentMimeType ?? null,
        attachmentFileName: attachmentPayload?.attachmentFileName ?? null,
        replyToId: replyTo?.id ?? null,
      });
      setMessages((current) =>
        current.some((existing) => existing.id === message.id) ? current : [...current, message]
      );
      setDraft("");
      setSelectedFile(null);
      setReplyTo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    await deleteMessageWithMode(messageId, "everyone");
  };

  const deleteMessageWithMode = async (messageId: string, mode: "me" | "everyone") => {
    try {
      setError("");
      await apiDelete<{ success: boolean }>(`/chat/messages/${messageId}?mode=${mode}`);
      if (mode === "me") {
        setMessages((current) => current.filter((item) => item.id !== messageId));
        setReplyTo((current) => (current?.id === messageId ? null : current));
        return;
      }
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                content: "This message was deleted",
                messageType: "TEXT",
                attachmentUrl: null,
                attachmentMimeType: null,
                attachmentFileName: null,
              }
            : item
        )
      );
      setReplyTo((current) => (current?.id === messageId ? null : current));
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to delete message"));
    }
  };

  const filteredMessages = useMemo(() => {
    if (!search.trim()) {
      return messages;
    }
    const q = search.toLowerCase();
    return messages.filter(
      (message) =>
        message.content.toLowerCase().includes(q) ||
        message.author.name.toLowerCase().includes(q) ||
        (message.attachmentFileName || "").toLowerCase().includes(q)
    );
  }, [messages, search]);

  const refreshRooms = async () => {
    const data = await apiGet<ChatRoomsResponse>("/chat/rooms");
    setRooms(data);
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      return;
    }
    try {
      setGroupSaving(true);
      await apiPost<ChatGroup>("/chat/groups", {
        name: groupName,
        description: groupDescription,
        memberIds: groupMemberIds,
      });
      setShowCreateGroup(false);
      setGroupName("");
      setGroupDescription("");
      setGroupMemberIds([]);
      await refreshRooms();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to create group"));
    } finally {
      setGroupSaving(false);
    }
  };

  const openGroupSettings = async () => {
    if (!selectedRoom || selectedRoom.type !== "GROUP") {
      return;
    }
    try {
      const [group, members] = await Promise.all([
        apiGet<ChatGroup>(`/chat/groups/${selectedRoom.id}`),
        apiGet<ChatGroupMember[]>(`/chat/groups/${selectedRoom.id}/members`),
      ]);
      setActiveGroup(group);
      setActiveGroupMembers(members);
      setShowGroupSettings(true);
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to load group settings"));
    }
  };

  const updateGroup = async () => {
    if (!activeGroup) {
      return;
    }
    try {
      setGroupSaving(true);
      const updated = await apiPut<ChatGroup>(`/chat/groups/${activeGroup.id}`, {
        name: activeGroup.name,
        description: activeGroup.description || "",
      });
      setActiveGroup(updated);
      await refreshRooms();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to update group"));
    } finally {
      setGroupSaving(false);
    }
  };

  const addMembersToGroup = async (memberIds: string[]) => {
    if (!activeGroup || !memberIds.length) {
      return;
    }
    try {
      const members = await apiPost<ChatGroupMember[]>(`/chat/groups/${activeGroup.id}/members`, { memberIds });
      setActiveGroupMembers(members);
      await refreshRooms();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to add members"));
    }
  };

  const removeMemberFromGroup = async (memberId: string) => {
    if (!activeGroup) {
      return;
    }
    try {
      await apiDelete<{ success: boolean }>(`/chat/groups/${activeGroup.id}/members/${memberId}`);
      setActiveGroupMembers((current) => current.filter((item) => item.userId !== memberId));
      await refreshRooms();
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to remove member"));
    }
  };

  const deleteGroup = async () => {
    if (!activeGroup) {
      return;
    }
    try {
      await apiDelete<void>(`/chat/groups/${activeGroup.id}`);
      setShowGroupSettings(false);
      setActiveGroup(null);
      setActiveGroupMembers([]);
      await refreshRooms();
      setSelectedKey("");
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to delete group"));
    }
  };

  const clearCurrentChatLocal = async () => {
    if (!selectedRoom) {
      return;
    }
    try {
      await apiPost<{ success: boolean }>(`/chat/clear/${selectedRoom.type}/${selectedRoom.id}`);
      setMessages([]);
    } catch (err) {
      setError(normalizeErrorMessage(err, "Failed to clear chat"));
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
          {canManageGroups ? (
            <button
              type="button"
              onClick={() => setShowCreateGroup(true)}
              className="mt-4 w-full rounded-xl border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
            >
              + Create group
            </button>
          ) : null}

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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--text-main)]">{room.name}</p>
                        {!!room.unreadCount ? (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-soft)]">{room.lastMessagePreview || room.subtitle}</p>
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">Groups</p>
              <div className="space-y-2">
                {rooms.groups.map((room) => {
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--text-main)]">{room.name}</p>
                        {!!room.unreadCount ? (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-soft)]">{room.lastMessagePreview || room.subtitle}</p>
                    </button>
                  );
                })}
                {!loading && !rooms.groups.length ? (
                  <p className="rounded-2xl border px-4 py-3 text-sm text-[var(--text-soft)]" style={{ borderColor: "var(--border)" }}>
                    No group room available.
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
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--text-main)]">{room.name}</p>
                        {!!room.unreadCount ? (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {room.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-[var(--text-soft)]">{room.lastMessagePreview || room.subtitle}</p>
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
                  {selectedRoom.type === "DEPARTMENT"
                    ? "Department room"
                    : selectedRoom.type === "PROJECT"
                      ? "Project room"
                      : "Group room"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-[var(--text-main)]">{selectedRoom.name}</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{selectedRoom.subtitle}</p>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search messages..."
                  className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-main)" }}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void clearCurrentChatLocal()}
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                  >
                    Clear chat (local)
                  </button>
                  {selectedRoom.type === "GROUP" && canManageGroups ? (
                    <button
                      type="button"
                      onClick={() => void openGroupSettings()}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                      style={{ borderColor: "var(--border)", color: "var(--text-main)" }}
                    >
                      Group settings
                    </button>
                  ) : null}
                </div>
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

                {filteredMessages.map((message) => {
                  const own = message.author.id === user.id;
                  const canDelete = own || user.role === "ADMIN" || user.role === "SUPERADMIN";
                  return (
                    <article key={message.id} className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"}`}>
                      {!own ? (
                        <div
                          className="mb-1 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: "var(--accent)" }}
                        >
                          {initials(message.author.name)}
                        </div>
                      ) : null}
                      <div
                        className="relative max-w-[760px] rounded-2xl border px-4 py-3"
                        style={{
                          borderColor: own ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)",
                          background: own ? "color-mix(in srgb, var(--accent) 12%, var(--surface))" : "var(--surface-soft)",
                        }}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2 pr-8">
                          <p className="text-sm font-semibold text-[var(--text-main)]">{message.author.name}</p>
                          <span className="text-xs text-[var(--text-faint)]">{message.author.role}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId((current) => (current === message.id ? null : message.id));
                          }}
                          className="absolute right-2 top-2 rounded-md px-2 py-0.5 text-sm text-[var(--text-soft)] hover:bg-black/5"
                        >
                          ...
                        </button>
                        {openMenuId === message.id ? (
                          <div
                            className="absolute right-2 top-9 z-20 min-w-40 rounded-xl border bg-black p-1 shadow-lg"
                            style={{ borderColor: "var(--border)" }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {!message.isDeleted ? (
                              <button
                                type="button"
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-soft)]"
                                onClick={() => {
                                  setReplyTo(message);
                                  setOpenMenuId(null);
                                }}
                              >
                                Reply
                              </button>
                            ) : null}
                            {canDelete && !message.isDeleted ? (
                              <button
                                type="button"
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--surface-soft)]"
                                onClick={() => {
                                  void deleteMessageWithMode(message.id, "me");
                                  setOpenMenuId(null);
                                }}
                              >
                                Delete for me
                              </button>
                            ) : null}
                            {canDelete && !message.isDeleted ? (
                              <button
                                type="button"
                                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  void deleteMessage(message.id);
                                  setOpenMenuId(null);
                                }}
                              >
                                Delete for everyone
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {message.replyTo ? (
                          <div className="mb-2 rounded-lg border-l-2 px-3 py-2 text-xs" style={{ borderColor: "var(--accent)", background: "var(--surface)" }}>
                            <p className="font-semibold text-[var(--text-main)]">{message.replyTo.author.name}</p>
                            <p className="text-[var(--text-soft)]">
                              {message.replyTo.isDeleted
                                ? "This message was deleted"
                                : message.replyTo.messageType === "TEXT"
                                  ? message.replyTo.content
                                  : message.replyTo.messageType === "PDF"
                                    ? message.replyTo.attachmentFileName || "PDF attachment"
                                    : "Image attachment"}
                            </p>
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-main)]">
                          {message.content}
                        </p>
                        {message.attachmentUrl && !message.isDeleted ? (
                          <div className="mt-3">
                            {message.messageType === "PDF" ? (
                              <a
                                href={resolveAttachmentUrl(message.attachmentUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex rounded-xl border px-3 py-2 text-sm font-medium text-[var(--text-main)]"
                                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                              >
                                {message.attachmentFileName || "Open PDF"}
                              </a>
                            ) : (
                              <img
                                src={resolveAttachmentUrl(message.attachmentUrl)}
                                alt={message.attachmentFileName || "Attachment"}
                                className={`rounded-xl border object-cover ${
                                  message.messageType === "STICKER" ? "max-h-40 max-w-40" : "max-h-72 max-w-full"
                                }`}
                                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                              />
                            )}
                          </div>
                        ) : null}
                        <div className="mt-2 text-right text-xs text-[var(--text-faint)]">{formatTime(message.createdAt)}</div>
                      </div>
                    </article>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
                {replyTo ? (
                  <div className="mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <p className="font-semibold text-[var(--text-main)]">Replying to {replyTo.author.name}</p>
                      <p className="text-[var(--text-soft)]">
                        {replyTo.isDeleted ? "This message was deleted" : replyTo.content || replyTo.attachmentFileName || "Attachment"}
                      </p>
                    </div>
                    <button type="button" className="text-[var(--text-soft)]" onClick={() => setReplyTo(null)}>
                      Cancel
                    </button>
                  </div>
                ) : null}
                {selectedFile ? (
                  <div className="mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <p className="truncate text-[var(--text-main)]">Attached: {selectedFile.name}</p>
                    <button type="button" className="text-[var(--text-soft)]" onClick={() => setSelectedFile(null)}>
                      Remove
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-11 w-11 rounded-full border text-2xl leading-none"
                    style={{ borderColor: "var(--border)", color: "var(--text-main)", background: "var(--surface-soft)" }}
                  >
                    +
                  </button>
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
                    className="min-h-12 flex-1 resize-none rounded-full border px-5 py-3 text-sm outline-none"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-soft)",
                      color: "var(--text-main)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || (!draft.trim() && !selectedFile)}
                    className="h-11 rounded-full px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
      {showCreateGroup ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-xl rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Create group</h3>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
            <input value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Description (optional)" className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
            <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
              {users.map((member) => (
                <label key={member.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={groupMemberIds.includes(member.id)}
                    onChange={(e) =>
                      setGroupMemberIds((current) =>
                        e.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id)
                      )
                    }
                  />
                  <span>{member.name} ({member.role})</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>Cancel</button>
              <button type="button" disabled={groupSaving || !groupName.trim()} onClick={() => void createGroup()} className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
                {groupSaving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showGroupSettings && activeGroup ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-md overflow-y-auto border-l p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-main)]">Group settings</h3>
              <button type="button" onClick={() => setShowGroupSettings(false)} className="text-sm">Close</button>
            </div>
            <input
              value={activeGroup.name}
              onChange={(e) => setActiveGroup((current) => (current ? { ...current, name: e.target.value } : current))}
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
            <textarea
              value={activeGroup.description || ""}
              onChange={(e) => setActiveGroup((current) => (current ? { ...current, description: e.target.value } : current))}
              className="mt-2 min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            />
            <button type="button" onClick={() => void updateGroup()} className="mt-2 rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "var(--accent)" }}>
              Save group
            </button>
            <div className="mt-4">
              <p className="text-sm font-semibold text-[var(--text-main)]">Members</p>
              <div className="mt-2 space-y-2">
                {activeGroupMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <span>{member.user.name} ({member.user.role})</span>
                    <button type="button" onClick={() => void removeMemberFromGroup(member.userId)} className="text-red-600">Remove</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "var(--border)" }}>
                {users
                  .filter((u) => !activeGroupMembers.some((m) => m.userId === u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => void addMembersToGroup([u.id])}
                      className="block w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-[var(--surface-soft)]"
                    >
                      Add {u.name} ({u.role})
                    </button>
                  ))}
              </div>
            </div>
            <button type="button" onClick={() => void deleteGroup()} className="mt-6 rounded-lg border px-3 py-2 text-sm text-red-600" style={{ borderColor: "color-mix(in srgb, red 30%, var(--border))" }}>
              Delete group
            </button>
          </div>
        </div>
      ) : null}
    </CRMShell>
  );
}
