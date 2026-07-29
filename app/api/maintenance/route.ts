import { actorFromRequest, errorResponse, isIsoDate } from "@/app/lib/api";
import { createMaintenance } from "@/db/repository";

type MaintenancePayload = {
  vehicleId?: string;
  driverId?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  serviceDescription?: string;
  provider?: string;
  notes?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MaintenancePayload;
    const vehicleId = clean(body.vehicleId);
    const driverId = clean(body.driverId);
    const startDate = clean(body.startDate);
    const startTime = clean(body.startTime);
    const endDate = clean(body.endDate);
    const endTime = clean(body.endTime);
    const serviceDescription = clean(body.serviceDescription);
    const provider = clean(body.provider);
    const notes = clean(body.notes);

    if (!vehicleId || !driverId || !startDate || !startTime || !endDate || !endTime || !serviceDescription) {
      return Response.json(
        { error: "Preencha veículo, responsável, período e serviço da manutenção." },
        { status: 400 },
      );
    }
    if (!isIsoDate(startDate) || !isIsoDate(endDate) || !isTime(startTime) || !isTime(endTime)) {
      return Response.json({ error: "Informe datas e horários válidos." }, { status: 400 });
    }

    const startAt = `${startDate}T${startTime}:00-03:00`;
    const endAt = `${endDate}T${endTime}:00-03:00`;
    const startMs = Date.parse(startAt);
    const endMs = Date.parse(endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      return Response.json(
        { error: "O término da manutenção deve ser posterior ao início." },
        { status: 400 },
      );
    }
    if (endMs - startMs > 90 * 24 * 60 * 60 * 1000) {
      return Response.json({ error: "A manutenção pode abranger no máximo 90 dias." }, { status: 400 });
    }
    if (serviceDescription.length > 160 || provider.length > 120 || notes.length > 1000) {
      return Response.json({ error: "As informações da manutenção excedem o limite." }, { status: 400 });
    }

    const maintenance = await createMaintenance(
      { vehicleId, driverId, startAt, endAt, serviceDescription, provider, notes },
      actorFromRequest(request),
    );
    return Response.json({ maintenance }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
