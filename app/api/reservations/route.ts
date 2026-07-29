import { actorFromRequest, errorResponse } from "@/app/lib/api";
import { createReservation } from "@/db/repository";

type ReservationPayload = {
  vehicleId?: string;
  driverId?: string | null;
  userName?: string;
  destination?: string;
  purpose?: string;
  startAt?: string;
  endAt?: string;
  notes?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationPayload;
    const input = {
      vehicleId: clean(body.vehicleId),
      driverId: clean(body.driverId) || null,
      userName: clean(body.userName),
      destination: clean(body.destination),
      purpose: clean(body.purpose) || "Visita externa",
      startAt: clean(body.startAt),
      endAt: clean(body.endAt),
      notes: clean(body.notes),
    };

    if (!input.vehicleId || !input.userName || !input.destination || !input.startAt || !input.endAt) {
      return Response.json(
        { error: "Preencha veículo, responsável, destino, saída e chegada." },
        { status: 400 },
      );
    }
    const start = Date.parse(input.startAt);
    const end = Date.parse(input.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return Response.json(
        { error: "O horário de chegada deve ser posterior ao horário de saída." },
        { status: 400 },
      );
    }
    if (input.destination.length > 240 || input.purpose.length > 160 || input.notes.length > 1000) {
      return Response.json({ error: "Destino, motivo ou observações excedem o limite permitido." }, { status: 400 });
    }

    const reservation = await createReservation(input, actorFromRequest(request));
    return Response.json({ reservation }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
