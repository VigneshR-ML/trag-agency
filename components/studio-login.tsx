"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";

export default function StudioLogin({ unconfigured = false }: { unconfigured?: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || unconfigured) return;
    setBusy(true);
    try {
      const response = await fetch("/api/studio/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) return toast.error(data.error ?? "Could not sign in");
      setPassword("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="studio-page studio-login-page">
      <Toaster position="top-right" />
        <header className="studio-header"><Link href="/"><ArrowLeft /> Back to portfolio</Link><img src="/trag-logo.png" alt="TRAG Agency" /><span>Project Studio</span></header>
      <section className="studio-intro"><p>Protected endpoint</p><h1>Studio access</h1><span>Enter the studio password to manage projects, images and reviews.</span></section>
      <form className="login-card" onSubmit={submit}>
        <span className="login-icon"><Lock /></span>
        <h2>Sign in</h2>
        {unconfigured && <p className="login-warn">STUDIO_PASSWORD is not set on this deployment, so the studio cannot be unlocked. Add it to your environment variables and redeploy.</p>}
        <Label htmlFor="studio-password">Password</Label>
        <Input id="studio-password" type="password" autoComplete="current-password" autoFocus={!unconfigured} disabled={unconfigured || busy} placeholder="Studio password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <Button type="submit" disabled={unconfigured || busy || !password}>{busy ? <Loader2 className="animate-spin" /> : <Lock />} {busy ? "Signing in" : "Enter studio"}</Button>
        <p className="login-hint">Sessions stay active on this device for 7 days.</p>
      </form>
    </main>
  );
}
