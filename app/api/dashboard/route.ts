import { getDashboard } from "@/db/repository";
import { actorFromRequest, errorResponse, isIsoDate } from "@/app/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    if (!isIsoDate(date)) {
      return Response.json({ error: "Informe uma data válida." }, { status: 400 });
    }
    const actor = actorFromRequest(request);
    const dashboard = await getDashboard(date);
    return Response.json({ ...dashboard, actor });
  } catch (error) {
    return errorResponse(error);
  }
}
