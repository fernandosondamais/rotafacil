export type VehiclePayload = {
  plate?: string;
  model?: string;
  color?: string;
  category?: string;
  odometerKm?: number | string;
  status?: string;
};

const categories = new Set(["Picape", "Furgão", "SUV", "Sedã", "Hatch", "Van", "Caminhão", "Outro"]);
const statuses = new Set(["active", "maintenance"]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePlate(value: unknown) {
  const compact = clean(value).toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9]/g, "");
  return compact.length === 7 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

export function parseVehiclePayload(body: VehiclePayload) {
  const input = {
    plate: normalizePlate(body.plate),
    model: clean(body.model),
    color: clean(body.color),
    category: clean(body.category),
    odometerKm:
      typeof body.odometerKm === "number"
        ? body.odometerKm
        : Number(clean(body.odometerKm)),
    status: clean(body.status) || "active",
  };
  if (!input.plate || !input.model || !input.color || !input.category || body.odometerKm === "" || body.odometerKm == null) {
    return { error: "Preencha placa, modelo, cor, categoria e odômetro." } as const;
  }
  if (!/^[A-Z]{3}-[A-Z0-9]{4}$/.test(input.plate)) {
    return { error: "Informe uma placa no formato ABC-1234 ou ABC-1D23." } as const;
  }
  if (!categories.has(input.category)) {
    return { error: "Categoria de veículo inválida." } as const;
  }
  if (!statuses.has(input.status)) {
    return { error: "Situação do veículo inválida." } as const;
  }
  if (input.model.length > 120 || input.color.length > 60) {
    return { error: "Modelo ou cor excede o limite permitido." } as const;
  }
  if (!Number.isInteger(input.odometerKm) || input.odometerKm < 0 || input.odometerKm > 9_999_999) {
    return { error: "Informe uma quilometragem inteira entre 0 e 9.999.999 km." } as const;
  }
  return {
    input: input as {
      plate: string;
      model: string;
      color: string;
      category: string;
      odometerKm: number;
      status: "active" | "maintenance";
    },
  } as const;
}
