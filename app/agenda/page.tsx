import type { Metadata } from "next";
import { AgendaBoard } from "@/app/components/AgendaBoard";

export const metadata: Metadata = {
  title: "Agenda de visitas | RotaFácil",
  description: "Planejamento de motoristas, obras e veículos por dia.",
};

export default function AgendaPage() {
  return <AgendaBoard />;
}
