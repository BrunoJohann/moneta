"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");

    if (!token || !refreshToken) {
      router.replace("/login");
      return;
    }

    localStorage.setItem("moneta_token", token);
    localStorage.setItem("moneta_refresh_token", refreshToken);

    document.cookie = `moneta_session=true; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

    router.replace("/");
  }, [params, router]);

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Autenticando…</p>
    </div>
  );
}
