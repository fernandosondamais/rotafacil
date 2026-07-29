import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { parseVehiclePayload } from "@/app/lib/vehicle";
import { updateVehicle } from "@/db/repository";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const parsed = parseVehiclePayload(await request.json());
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const vehicle = await updateVehicle(id, parsed.input, actorFromRequest(request));
    return Response.json({ vehicle });
  } catch (error) {
    return errorResponse(error);
  }
}
