export type DriverPayload = {
  name?: string;
  phone?: string;
  color?: string;
};

const allowedColors = new Set([
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#d97706",
  "#db2777",
  "#475569",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseDriverPayload(body: DriverPayload) {
  const input = {
    name: clean(body.name).replace(/\s+/g, " "),
    phone: clean(body.phone),
    color: clean(body.color).toLocaleLowerCase(),
  };

  if (!input.name) return { error: "Informe o nome do motorista." } as const;
  if (input.name.length < 2 || input.name.length > 100) {
    return { error: "O nome deve ter entre 2 e 100 caracteres." } as const;
  }
  if (input.phone.length > 30) {
    return { error: "O telefone deve ter no máximo 30 caracteres." } as const;
  }
  if (!allowedColors.has(input.color)) {
    return { error: "Selecione uma cor válida para o motorista." } as const;
  }
  return { input } as const;
}
