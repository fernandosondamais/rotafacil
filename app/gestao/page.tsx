import type { Metadata } from "next";
import { ManagementDashboard } from "@/app/components/ManagementDashboard";

export const metadata: Metadata = {
  title: "Painel gerencial | RotaFácil",
  description: "Indicadores de utilização da frota e desempenho operacional da equipe.",
};

export default function ManagementPage() {
  return <ManagementDashboard />;
}
