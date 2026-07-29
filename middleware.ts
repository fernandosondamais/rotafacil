import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  isValidSessionToken,
  safeNextPath,
} from "@/app/lib/session";

const PUBLIC_PATHS = new Set(["/", "/login"]);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/og.png" ||
    pathname === "/hero-rotafacil.jpg" ||
    /\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|map|txt)$/i.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = process.env.APP_PASSWORD?.trim();

  if (isPublicAsset(pathname) || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (!password) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await isValidSessionToken(token, password);

  if (PUBLIC_PATHS.has(pathname)) {
    if (authenticated && pathname === "/login") {
      const next = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
