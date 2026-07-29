"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const value = searchParams.get("next");
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
      return "/frota";
    }
    return value;
  }, [searchParams]);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, next: nextPath }),
      });
      const payload = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        setError(payload.error || "Não foi possível entrar.");
        return;
      }
      router.replace(payload.next || nextPath);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <Link className="login-back" href="/">
          ← Voltar à abertura
        </Link>
        <h1>Entrar no RotaFácil</h1>
        <p>Informe seu nome e a senha da equipe para acessar o app.</p>
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            Seu nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Fernando"
              autoComplete="name"
            />
          </label>
          <label>
            Senha de acesso
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha da equipe"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={loading || !password.trim()}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="login-shell"><p>Carregando…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
