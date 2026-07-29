const SESSION_COOKIE = "rotafacil_session";

export { SESSION_COOKIE };

export async function createSessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`rotafacil-session:v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSessionToken(
  token: string | undefined,
  password: string | undefined,
): Promise<boolean> {
  if (!token || !password) return false;
  const expected = await createSessionToken(password);
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < token.length; index += 1) {
    mismatch |= token.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/frota";
  }
  if (value === "/" || value.startsWith("/login")) {
    return "/frota";
  }
  return value;
}
