import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { updateAgendaVisitStatus } from "@/db/repository";

type Context = { params: Promise<{ id: string }> };
const actions = new Set(["confirm", "start", "complete", "cancel"]);

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    const action = typeof body.action === "string" ? body.action : "";
    if (!actions.has(action)) {
      return Response.json({ error: "Ação de agenda inválida." }, { status: 400 });
    }
    const visit = await updateAgendaVisitStatus(
      id,
      action as "confirm" | "start" | "complete" | "cancel",
      actorFromRequest(request),
    );
    return Response.json({ visit });
  } catch (error) {
    return errorResponse(error);
  }
}
