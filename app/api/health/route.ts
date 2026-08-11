import { NextResponse } from "next/server";
import { getRuntimeMode, warmBindings } from "@/db/runtime";

export async function GET() {
  try {
    await warmBindings();
    return NextResponse.json({
      ok: true,
      mode: getRuntimeMode(),
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
      render: Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: getRuntimeMode(),
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
        error: error instanceof Error ? error.message : "Falha ao iniciar o banco.",
      },
      { status: 500 },
    );
  }
}
