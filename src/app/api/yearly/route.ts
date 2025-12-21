import { NextResponse } from "next/server";
import { getYearlySummary } from "../../../lib/yearly";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Error desconocido";
}

function currentYear(): number {
  return new Date().getFullYear();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : currentYear();

    const summary = await getYearlySummary(year);

    return NextResponse.json({ ok: true, summary });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: getErrorMessage(err) },
      { status: 400 }
    );
  }
}
