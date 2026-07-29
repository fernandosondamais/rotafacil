import type { Actor } from "@/db/repository";
import { RepositoryError } from "@/db/repository";

export function actorFromRequest(request: Request): Actor {
  const emailHeader = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let email = emailHeader ?? "paulo@desenvolvimento.local";
  let name = "Paulo";

  const authorization = request.headers.get("authorization");
  if (!emailHeader && authorization?.startsWith("Basic ")) {
    try {
      const decoded = atob(authorization.slice(6));
      const separator = decoded.indexOf(":");
      const user = separator >= 0 ? decoded.slice(0, separator) : "operador";
      if (user) {
        email = user.includes("@") ? user : `${user}@rotafacil.local`;
        name = user.includes("@") ? user.split("@")[0] || "Operador" : user;
      }
    } catch {
      // mantém fallback local
    }
  }

  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      name = encodedName;
    }
  } else if (emailHeader) {
    name = emailHeader.split("@")[0] || "Usuário";
  }

  return { email, name };
}

export function errorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return Response.json({ error: "O conteúdo enviado não é um JSON válido." }, { status: 400 });
  }
  if (error instanceof RepositoryError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  console.error(error);
  return Response.json({ error: message }, { status: 500 });
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
