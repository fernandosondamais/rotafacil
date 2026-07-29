import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { archiveDriver } from "@/db/repository";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const driver = await archiveDriver(id, actorFromRequest(request));
    return Response.json({ driver });
  } catch (error) {
    return errorResponse(error);
  }
}
