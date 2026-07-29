import { errorResponse } from "@/app/lib/api";
import { getPhoto } from "@/db/repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const photo = await getPhoto(id);
    if (!photo) return Response.json({ error: "Foto não encontrada." }, { status: 404 });

    const headers = new Headers();
    photo.object.writeHttpMetadata(headers);
    headers.set("Content-Type", photo.content_type);
    headers.set("Content-Disposition", `inline; filename="${photo.filename.replace(/[\"\r\n]/g, "")}"`);
    headers.set("Cache-Control", "private, max-age=300");
    return new Response(Buffer.from(photo.object.body), { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
