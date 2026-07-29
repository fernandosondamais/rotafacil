import { actorFromRequest, errorResponse, isIsoDate } from "@/app/lib/api";
import { createAgendaVisit, getAgenda } from "@/db/repository";

type AgendaPayload = {
  driverId?: string;
  workSiteId?: string;
  vehicleId?: string | null;
  visitDate?: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  notes?: string;
};

const statuses = new Set(["planned", "confirmed", "in_progress", "completed", "cancelled"]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start") ?? "";
    const requestedDays = Number(url.searchParams.get("days") ?? "14");
    const status = clean(url.searchParams.get("status"));
    if (!isIsoDate(startDate)) {
      return Response.json({ error: "Informe uma data inicial válida." }, { status: 400 });
    }
    if (![7, 14, 21].includes(requestedDays)) {
      return Response.json({ error: "O período deve ter 7, 14 ou 21 dias." }, { status: 400 });
    }
    if (status && !statuses.has(status)) {
      return Response.json({ error: "Status de visita inválido." }, { status: 400 });
    }

    const agenda = await getAgenda(startDate, requestedDays, {
      driverId: clean(url.searchParams.get("driver")),
      status,
      query: clean(url.searchParams.get("query")).slice(0, 120),
    });
    return Response.json({ ...agenda, actor: actorFromRequest(request) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgendaPayload;
    const input = {
      driverId: clean(body.driverId),
      workSiteId: clean(body.workSiteId),
      vehicleId: clean(body.vehicleId) || null,
      visitDate: clean(body.visitDate),
      startTime: clean(body.startTime),
      endTime: clean(body.endTime),
      purpose: clean(body.purpose) || "Visita de obra",
      notes: clean(body.notes),
    };

    if (!input.driverId || !input.workSiteId || !input.visitDate || !input.startTime || !input.endTime) {
      return Response.json(
        { error: "Preencha dia, motorista, obra, início e término." },
        { status: 400 },
      );
    }
    if (!isIsoDate(input.visitDate) || !isTime(input.startTime) || !isTime(input.endTime)) {
      return Response.json({ error: "Informe data e horários válidos." }, { status: 400 });
    }
    if (input.endTime <= input.startTime) {
      return Response.json(
        { error: "O horário de término deve ser posterior ao início." },
        { status: 400 },
      );
    }
    if (input.purpose.length > 160 || input.notes.length > 1000) {
      return Response.json({ error: "Finalidade ou observações excedem o limite." }, { status: 400 });
    }

    const visit = await createAgendaVisit(input, actorFromRequest(request));
    return Response.json({ visit }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
