import { actorFromRequest, errorResponse, isIsoDate } from "@/app/lib/api";
import { getManagementDashboard } from "@/db/repository";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start") ?? "";
    const endDate = url.searchParams.get("end") ?? "";
    if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
      return Response.json({ error: "Informe um período válido." }, { status: 400 });
    }
    const start = Date.parse(`${startDate}T12:00:00Z`);
    const end = Date.parse(`${endDate}T12:00:00Z`);
    const days = Math.floor((end - start) / 86_400_000) + 1;
    if (!Number.isFinite(days) || days < 1) {
      return Response.json(
        { error: "A data final deve ser igual ou posterior à data inicial." },
        { status: 400 },
      );
    }
    if (days > 366) {
      return Response.json({ error: "O período máximo para análise é de 366 dias." }, { status: 400 });
    }

    const dashboard = await getManagementDashboard(startDate, endDate);
    return Response.json({ ...dashboard, actor: actorFromRequest(request) });
  } catch (error) {
    return errorResponse(error);
  }
}
