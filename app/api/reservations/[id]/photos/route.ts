import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { saveReservationPhoto } from "@/db/repository";

type RouteContext = { params: Promise<{ id: string }> };
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 8 * 1024 * 1024;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("photo");
    const stage = formData.get("stage");

    if (!(file instanceof File)) {
      return Response.json({ error: "Selecione uma foto." }, { status: 400 });
    }
    if (stage !== "checkout" && stage !== "return") {
      return Response.json({ error: "Etapa da foto inválida." }, { status: 400 });
    }
    if (!acceptedTypes.has(file.type)) {
      return Response.json({ error: "Use uma imagem JPG, PNG ou WebP." }, { status: 415 });
    }
    if (file.size <= 0 || file.size > maxFileSize) {
      return Response.json({ error: "A foto deve ter até 8 MB." }, { status: 413 });
    }

    const photo = await saveReservationPhoto(id, stage, file, actorFromRequest(request));
    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
