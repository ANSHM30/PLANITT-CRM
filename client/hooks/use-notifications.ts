"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/components/providers/socket-provider";
import { getToken } from "@/lib/auth";
import type { CRMUser } from "@/types/crm";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const MAX_NOTIFICATIONS = 40;

function storageKey(userId: string) {
  return `crm-notifications:${userId}`;
}

function createNotificationId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useNotifications(user: CRMUser) {
  const { socket } = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey(user.id));
    if (!raw) {
      setItems([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as NotificationItem[];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [user.id]);

  useEffect(() => {
    window.localStorage.setItem(storageKey(user.id), JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  }, [items, user.id]);

  useEffect(() => {
    if (!socket || !getToken()) {
      return;
    }

    socket.emit("crm:join", {
      userId: user.id,
      role: user.role,
    });

    const push = (notification: Omit<NotificationItem, "id" | "createdAt" | "read">) => {
      setItems((current) => [
        {
          id: createNotificationId(),
          createdAt: new Date().toISOString(),
          read: false,
          ...notification,
        },
        ...current,
      ]);
    };

    const handleTaskUpdated = (payload: any = {}) => {
      if (payload.actorId === user.id) {
        return;
      }

      const taskHref = `/tasks?taskId=${payload.taskId ?? ""}`;
      const assignedUserIds: string[] = Array.isArray(payload.assignedUserIds) ? payload.assignedUserIds : [];
      const newlyAssignedUserIds: string[] = Array.isArray(payload.newlyAssignedUserIds)
        ? payload.newlyAssignedUserIds
        : [];

      if (payload.type === "task_created" && assignedUserIds.includes(user.id)) {
        push({
          title: "New Task Assigned",
          message: payload.taskTitle ? `${payload.taskTitle} is assigned to you.` : "A new task is assigned to you.",
          href: taskHref,
        });
        return;
      }

      if (payload.type === "task_modified") {
        if (newlyAssignedUserIds.includes(user.id)) {
          push({
            title: "Task Assigned",
            message: payload.taskTitle
              ? `You were added to ${payload.taskTitle}.`
              : "You were added to a task assignment.",
            href: taskHref,
          });
          return;
        }

        if (assignedUserIds.includes(user.id)) {
          push({
            title: "Task Updated",
            message: payload.taskTitle ? `${payload.taskTitle} was updated.` : "One of your tasks was updated.",
            href: taskHref,
          });
        }
      }
    };

    const handleIssueUpdated = (payload: any = {}) => {
      if (payload.actorId === user.id) {
        return;
      }

      const issueHref = `/tasks?taskId=${payload.taskId ?? ""}&issueId=${payload.issueId ?? ""}`;
      const roles: string[] = Array.isArray(payload.notifyRoles) ? payload.notifyRoles : [];
      const assignedUserIds: string[] = Array.isArray(payload.assignedUserIds) ? payload.assignedUserIds : [];

      if (payload.type === "issue_reported") {
        if (!roles.includes(user.role)) {
          return;
        }
        push({
          title: "New Issue Reported",
          message: payload.reporterName
            ? `${payload.reporterName} reported: ${payload.issueTitle ?? "Task issue"}.`
            : "An employee/intern reported a new issue.",
          href: issueHref,
        });
        return;
      }

      if (payload.type === "issue_responded") {
        const shouldNotify = payload.reporterId === user.id || assignedUserIds.includes(user.id);
        if (!shouldNotify) {
          return;
        }

        push({
          title: "Issue Updated",
          message: payload.issueTitle
            ? `Response added for: ${payload.issueTitle}.`
            : "A response was added to your reported issue.",
          href: issueHref,
        });
      }
    };

    socket.on("task:updated", handleTaskUpdated);
    socket.on("issue:updated", handleIssueUpdated);

    return () => {
      socket.off("task:updated", handleTaskUpdated);
      socket.off("issue:updated", handleIssueUpdated);
    };
  }, [socket, user.id, user.role]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const markAllRead = () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  };

  const markRead = (id: string) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  };

  const clearAll = () => {
    setItems([]);
  };

  return {
    items,
    unreadCount,
    markAllRead,
    markRead,
    clearAll,
  };
}

