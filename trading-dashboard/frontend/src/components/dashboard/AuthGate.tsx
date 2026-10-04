"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("td_token");
    if (!token) router.replace("/login");
  }, [router]);
  return <>{children}</>;
}
