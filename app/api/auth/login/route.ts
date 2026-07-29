import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  safeNextPath,
} from "@/app/lib/session";

export async function POST(request: Request) {
  const password = process.env.APP_PASSWORD?.trim();
  if (!password) {
    return NextResponse.json(
      { error: "APP_PASSWORD não configurada no servidor." },
      { status: 500 },
    );
  }

  let body: { password?: string; name?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body.password || body.password !== password) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await createSessionToken(password);
  const next = safeNextPath(body.next);
  const response = NextResponse.json({
    ok: true,
    next,
    name: body.name?.trim() || "Operador",
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  if (body.name?.trim()) {
    response.cookies.set({
      name: "rotafacil_actor_name",
      value: encodeURIComponent(body.name.trim()),
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }

  return response;
}
