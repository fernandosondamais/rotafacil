import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { updateMaintenanceStatus } from "@/db/repository";

type Context = { params: Promise<{ id: string }> };
const actions = new Set(["start", "complete", "cancel"]);

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    const action = typeof body.action === "string" ? body.action : "";
    if (!actions.has(action)) {
      return Response.json({ error: "Ação de manutenção inválida." }, { status: 400 });
    }
    const maintenance = await updateMaintenanceStatus(
      id,
      action as "start" | "complete" | "cancel",
      actorFromRequest(request),
    );
    return Response.json({ maintenance });
  } catch (error) {
    return errorResponse(error);
  }
}
