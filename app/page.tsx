import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RotaFácil — Gestão inteligente da frota",
  description: "Reserve. Registre. Siga. Abra o app ou o painel de gestão.",
};

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <div className="landing-hero" role="img" aria-label="RotaFácil — Gestão inteligente da frota">
        <img
          className="landing-hero-image"
          src="/hero-rotafacil.jpg"
          alt="RotaFácil — Gestão inteligente da frota. Reserve. Registre. Siga."
        />
        <div className="landing-scrim" aria-hidden="true" />
      </div>

      <div className="landing-content">
        <p className="landing-kicker">Acesso à operação</p>
        <div className="landing-actions">
          <Link className="landing-btn landing-btn-primary" href="/login?next=/frota">
            Abrir app
          </Link>
          <Link className="landing-btn landing-btn-secondary" href="/login?next=/gestao">
            Abrir gestão
          </Link>
          <Link className="landing-btn landing-btn-ghost" href="/login?next=/agenda">
            Abrir agenda
          </Link>
        </div>
      </div>
    </main>
  );
}
