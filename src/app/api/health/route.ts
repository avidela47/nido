import { NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

export async function GET() {
  try {
    const db = await getDb();
    const ping = await db.command({ ping: 1 });

    return NextResponse.json({
      ok: true,
      db: db.databaseName,
      ping,
      ts: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(err),
      },
      { status: 500 }
    );
  }
}

