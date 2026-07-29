import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { parseVehiclePayload, type VehiclePayload } from "@/app/lib/vehicle";
import { createVehicle } from "@/db/repository";

export async function POST(request: Request) {
  try {
    const parsed = parseVehiclePayload((await request.json()) as VehiclePayload);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const vehicle = await createVehicle(parsed.input, actorFromRequest(request));
    return Response.json({ vehicle }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
