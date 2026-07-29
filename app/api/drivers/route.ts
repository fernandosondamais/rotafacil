import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { parseDriverPayload, type DriverPayload } from "@/app/lib/driver";
import { createDriver } from "@/db/repository";

export async function POST(request: Request) {
  try {
    const parsed = parseDriverPayload((await request.json()) as DriverPayload);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    const driver = await createDriver(parsed.input, actorFromRequest(request));
    return Response.json({ driver }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
