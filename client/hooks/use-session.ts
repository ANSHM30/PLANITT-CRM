"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { normalizeErrorMessage } from "@/lib/error-message";
import type { CRMUser, UserRole } from "@/types/crm";

type UseSessionOptions = {
  redirectTo?: string;
  allowedRoles?: UserRole[];
};

export function useSession(options: UseSessionOptions = {}) {
  const router = useRouter();
  const { allowedRoles, redirectTo = "/login" } = options;
  const rolesKey = allowedRoles?.join(",") ?? "";
  const [user, setUser] = useState<CRMUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const token = getToken();

      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        router.replace(redirectTo);
        return;
      }

      try {
        const currentUser = await apiGet<CRMUser>("/auth/me");

        if (!isMounted) {
          return;
        }

        if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
          router.replace("/dashboard");
          return;
        }

        setUser(currentUser);
      } catch (err) {
        clearToken();
        if (isMounted) {
          setError(normalizeErrorMessage(err, "Authentication failed"));
        }
        router.replace(redirectTo);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [rolesKey, redirectTo, router]);

  return {
    user,
    loading,
    error,
  };
}
