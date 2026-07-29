import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { updateReservationStatus } from "@/db/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    if (!body.action || !["cancel", "start", "complete"].includes(body.action)) {
      return Response.json({ error: "Ação inválida." }, { status: 400 });
    }
    const reservation = await updateReservationStatus(
      id,
      body.action as "cancel" | "start" | "complete",
      actorFromRequest(request),
    );
    return Response.json({ reservation });
  } catch (error) {
    return errorResponse(error);
  }
}
